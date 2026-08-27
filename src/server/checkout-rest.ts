import { getDB, saveDB } from '~/db'
import { evaluatePurchase, appendReceipt, getRules, setRules } from '~/db/rules'
import type { RuleSet } from '~/db'

// REST-facing checkout that runs the identical governance gate as the agent tool path.
const processedKeys = new Set<string>()

export type CheckoutInput = {
  reasoning?: string
  actor?: 'agent' | 'human'
  idempotency_key?: string
}

export async function handleCheckout(input: CheckoutInput) {
  if (input.idempotency_key && processedKeys.has(input.idempotency_key)) {
    return { status: 'duplicate', message: 'This exact purchase was already processed.' }
  }

  const db = await getDB()
  const lines = db.cart.map(ci => {
    const p = db.products.find(x => x.id === ci.product_id)!
    return { product_id: p.id, qty: ci.qty, name: p.name, brand: p.brand, category: p.category, price_cents: p.price_cents }
  })
  if (lines.length === 0) return { status: 'empty', message: 'Cart is empty.' }

  const total = lines.reduce((s, l) => s + l.price_cents * l.qty, 0)
  const categories = [...new Set(lines.map(l => l.category))]
  const brands = [...new Set(lines.map(l => l.brand))]
  const { verdict } = await evaluatePurchase({ total_cents: total, categories, brands })

  if (verdict.action === 'blocked') {
    await appendReceipt({
      kind: 'blocked',
      item_ids: lines.map(l => l.product_id),
      total_cents: total,
      actor: input.actor ?? 'agent',
      rule_fired: verdict.rule,
      reasoning: verdict.reason,
    })
    if (input.idempotency_key) processedKeys.add(input.idempotency_key)
    return { status: 'blocked', rule: verdict.rule, reason: verdict.reason, total }
  }

  if (verdict.action === 'needs_approval' && input.actor === 'agent') {
    return {
      status: 'needs_approval',
      rule: verdict.rule,
      reason: verdict.reason,
      total,
      lines: lines.map(l => ({ name: l.name, qty: l.qty, price_cents: l.price_cents })),
    }
  }

  for (const l of lines) {
    const p = db.products.find(x => x.id === l.product_id)
    if (p) p.stock = Math.max(0, p.stock - l.qty)
  }
  db.clearCart()

  const rules = await getRules()
  const nextSpent = rules.spent_this_month_cents + total
  // bump spent without emitting a rule_change receipt
  const cur = JSON.parse(db.kv['rules']) as RuleSet
  db.kv['rules'] = JSON.stringify({ ...cur, spent_this_month_cents: nextSpent })
  await saveDB()

  const receipt = await appendReceipt({
    kind: 'purchase',
    item_ids: lines.map(l => l.product_id),
    total_cents: total,
    actor: input.actor ?? 'agent',
    rule_fired: verdict.action === 'needs_approval'
      ? `${verdict.rule} (human approved)`
      : verdict.rule,
    reasoning: input.reasoning ?? verdict.reason,
  })
  if (input.idempotency_key) processedKeys.add(input.idempotency_key)

  return {
    status: 'purchased',
    receipt_id: receipt.id,
    reversal_deadline_ts: receipt.ts + 5 * 60 * 1000,
    total,
    spent_this_month_cents: nextSpent,
    envelope_cents: rules.monthly_envelope_cents,
  }
}

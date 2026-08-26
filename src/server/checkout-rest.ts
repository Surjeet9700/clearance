import { getDB } from '~/db'
import { evaluatePurchase, appendReceipt, getRules } from '~/db/rules'

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
  const { rows: lines } = await db.query<{
    product_id: number
    qty: number
    name: string
    brand: string
    category: string
    price_cents: number
  }>(
    `SELECT ci.product_id, ci.qty, p.name, p.brand, p.category, p.price_cents
     FROM cart_items ci JOIN products p ON p.id = ci.product_id ORDER BY ci.id`,
  )
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
    await db.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [l.qty, l.product_id])
  }
  await db.exec('DELETE FROM cart_items')

  const rules = await getRules()
  // persist spent increment without emitting a rule_change receipt
  const nextSpent = rules.spent_this_month_cents + total
  await db.query(
    `INSERT INTO kv (k, v) VALUES ('rules', $1)
     ON CONFLICT (k) DO UPDATE SET v = $1`,
    [JSON.stringify({ ...rules, spent_this_month_cents: nextSpent })],
  )

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

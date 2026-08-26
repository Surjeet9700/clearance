import { createServerFn } from '@tanstack/react-start'
import { getDB, sha256 } from '~/db'
import {
  getRules,
  setRules,
  evaluatePurchase,
  appendReceipt,
  listReceipts,
  markUndone,
  lastReceipt,
} from '~/db/rules'

export type CartLine = {
  product_id: number
  qty: number
  name: string
  brand: string
  category: string
  price_cents: number
}

// ---------- reads (used by UI + agent tools) ----------
export type Product = {
  id: number
  name: string
  brand: string
  category: string
  price_cents: number
  rating: number
  stock: number
  blurb: string
}

export const listProducts = createServerFn({ method: 'GET' }).handler(async (): Promise<Product[]> => {
  const db = await getDB()
  const { rows } = await db.query<Product>('SELECT * FROM products ORDER BY id')
  return rows
})

export const getCart = createServerFn({ method: 'GET' }).handler(async (): Promise<CartLine[]> => {
  const db = await getDB()
  const { rows } = await db.query<CartLine>(
    `SELECT ci.product_id, ci.qty, p.name, p.brand, p.category, p.price_cents
     FROM cart_items ci JOIN products p ON p.id = ci.product_id ORDER BY ci.id`,
  )
  return rows
})

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((s, l) => s + l.price_cents * l.qty, 0)

export const readRules = createServerFn({ method: 'GET' }).handler(async () => getRules())

export const updateRules = createServerFn({ method: 'POST' })
  .validator((d: Parameters<typeof setRules>[0]) => d)
  .handler(async ({ data }) => setRules(data))

export const readReceipts = createServerFn({ method: 'GET' }).handler(async () => listReceipts())

// ---------- writes ----------
export const addToCart = createServerFn({ method: 'POST' })
  .validator((d: { product_id: number; qty?: number }) => d)
  .handler(async ({ data }) => {
    const db = await getDB()
    const { rows } = await db.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [data.product_id])
    if (!rows[0]) return { ok: false, error: 'Product not found' }
    if (rows[0].stock < 1) return { ok: false, error: 'Out of stock' }
    await db.query(
      `INSERT INTO cart_items (product_id, qty) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [data.product_id, data.qty ?? 1],
    )
    // simple dedupe: if same product already in cart, bump qty instead
    await db.query(
      `UPDATE cart_items SET qty = qty + $2 WHERE id = (
         SELECT id FROM cart_items WHERE product_id = $1 ORDER BY id DESC LIMIT 1
       ) AND (SELECT COUNT(*) FROM cart_items WHERE product_id = $1) > 1`,
      [data.product_id, data.qty ?? 1],
    )
    await db.query(
      `DELETE FROM cart_items WHERE id IN (
         SELECT id FROM cart_items WHERE product_id = $1 ORDER BY id LIMIT 1 OFFSET 0
       ) AND (SELECT COUNT(*) FROM cart_items WHERE product_id=$1) > 1`,
      [data.product_id],
    )
    return { ok: true }
  })

export const removeFromCart = createServerFn({ method: 'POST' })
  .validator((d: { product_id: number }) => d)
  .handler(async ({ data }) => {
    const db = await getDB()
    await db.query('DELETE FROM cart_items WHERE product_id = $1', [data.product_id])
    return { ok: true }
  })

export const clearCart = createServerFn({ method: 'POST' }).handler(async () => {
  const db = await getDB()
  await db.exec('DELETE FROM cart_items')
  return { ok: true }
})

// The heart of the product: checkout through the governance gate.
// idempotency_key makes retries safe (the #1 technical objection on the launch post).
const processedKeys = new Set<string>()

export const checkout = createServerFn({ method: 'POST' })
  .validator((d: { reasoning?: string; actor?: 'agent' | 'human'; idempotency_key?: string }) => d)
  .handler(async ({ data }) => {
    const key = data.idempotency_key ?? ''
    if (key && processedKeys.has(key)) {
      return { status: 'duplicate', message: 'This exact purchase was already processed.' as const }
    }

    const lines = await (async () => {
      const db = await getDB()
      const { rows } = await db.query<CartLine>(
        `SELECT ci.product_id, ci.qty, p.name, p.brand, p.category, p.price_cents
         FROM cart_items ci JOIN products p ON p.id = ci.product_id ORDER BY ci.id`,
      )
      return rows
    })()
    if (lines.length === 0) return { status: 'empty', message: 'Cart is empty.' as const }

    const total = cartTotal(lines)
    const categories = [...new Set(lines.map(l => l.category))]
    const brands = [...new Set(lines.map(l => l.brand))]

    const { verdict } = await evaluatePurchase({ total_cents: total, categories, brands })

    if (verdict.action === 'blocked') {
      await appendReceipt({
        kind: 'blocked',
        item_ids: lines.map(l => l.product_id),
        total_cents: total,
        actor: data.actor ?? 'agent',
        rule_fired: verdict.rule,
        reasoning: verdict.reason,
      })
      if (key) processedKeys.add(key)
      return { status: 'blocked' as const, rule: verdict.rule, reason: verdict.reason, total }
    }

    if (verdict.action === 'needs_approval' && data.actor === 'agent') {
      // The tool layer converts this into a requestUserInteraction pause.
      return {
        status: 'needs_approval' as const,
        rule: verdict.rule,
        reason: verdict.reason,
        total,
        lines,
      }
    }

    // execute purchase (auto-approved OR human explicitly approved via card click)
    const db = await getDB()
    for (const l of lines) {
      await db.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [l.qty, l.product_id])
    }
    await db.exec('DELETE FROM cart_items')
    const rules = await getRules()
    const nextSpent = rules.spent_this_month_cents + total
    await updateRulesInternal(nextSpent)

    const receipt = await appendReceipt({
      kind: 'purchase',
      item_ids: lines.map(l => l.product_id),
      total_cents: total,
      actor: data.actor ?? 'agent',
      rule_fired: verdict.rule,
      reasoning: data.reasoning ?? verdict.reason,
    })
    if (key) processedKeys.add(key)

    return {
      status: 'purchased' as const,
      receipt_id: receipt.id,
      reversal_deadline_ts: receipt.ts + 5 * 60 * 1000,
      total,
      spent_this_month_cents: nextSpent,
      envelope_cents: rules.monthly_envelope_cents,
    }
  })

async function updateRulesInternal(spent: number) {
  const cur = await getRules()
  await setRulesQuiet({ ...cur, spent_this_month_cents: spent })
}

async function setRulesQuiet(patch: Partial<Awaited<ReturnType<typeof getRules>>>) {
  const { getDB } = await import('~/db')
  const db = await getDB()
  await db.query(
    `INSERT INTO kv (k,v) VALUES ('rules',$2) ON CONFLICT (k) DO UPDATE SET v = $2`,
    [JSON.stringify(patch)],
  )
}

export const undoPurchase = createServerFn({ method: 'POST' })
  .validator((d: { receipt_id: string }) => d)
  .handler(async ({ data }) => {
    const r = await listReceipts(200)
    const target = r.find(x => x.id === data.receipt_id && x.kind === 'purchase')
    if (!target) return { ok: false, error: 'Receipt not found' }
    const deadline = target.ts + 5 * 60 * 1000
    if (Date.now() > deadline) return { ok: false, error: 'Reversal window has closed' }
    const ok = await markUndone(data.receipt_id)
    return { ok, error: ok ? undefined : 'Could not reverse this receipt' }
  })

// chain verification endpoint - judges can prove receipts are tamper-evident
export const verifyChain = createServerFn({ method: 'GET' }).handler(async () => {
  const receipts = await listReceipts(500)
  let prevHash = 'GENESIS'
  for (const r of [...receipts].sort((a, b) => a.ts - b.ts)) {
    const expected = await sha256(
      JSON.stringify({
        kind: r.kind,
        item_ids: r.item_ids,
        total_cents: r.total_cents,
        actor: r.actor,
        rule_fired: r.rule_fired,
        reasoning: r.reasoning,
        id: r.id,
        ts: r.ts,
        prev_hash: prevHash,
      }),
    )
    if (expected !== r.hash || r.prev_hash !== prevHash) {
      return { valid: false, broken_at: r.id }
    }
    prevHash = r.hash
  }
  return { valid: true, length: receipts.length, head: (await lastReceipt())?.hash }
})

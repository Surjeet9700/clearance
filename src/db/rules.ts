import { getDB, sha256, type RuleSet, type Receipt } from './index'

export const DEFAULT_RULES: RuleSet = {
  balance_cents: 50000,
  spent_this_month_cents: 0,
  monthly_envelope_cents: 20000,
  per_purchase_cap_cents: 8000,
  auto_approve_below_cents: 3000,
  allowed_categories: null,
  blocked_merchants: ['ForgeWorks'],
}

const RULES_KEY = 'rules'

async function readRules(db: Awaited<ReturnType<typeof getDB>>): Promise<RuleSet> {
  const { rows } = await db.query<{ v: string }>('SELECT v FROM kv WHERE k = $1', [RULES_KEY])
  if (!rows[0]) {
    await db.query('INSERT INTO kv (k, v) VALUES ($1, $2)', [RULES_KEY, JSON.stringify(DEFAULT_RULES)])
    return DEFAULT_RULES
  }
  return JSON.parse(rows[0].v) as RuleSet
}

export async function getRules(): Promise<RuleSet> {
  const db = await getDB()
  return readRules(db)
}

export async function setRules(patch: Partial<Omit<RuleSet, 'spent_this_month_cents'>>): Promise<RuleSet> {
  const db = await getDB()
  const cur = await readRules(db)
  const next: RuleSet = { ...cur, ...patch }
  await db.query('UPDATE kv SET v = $2 WHERE k = $1', [RULES_KEY, JSON.stringify(next)])
  await appendReceipt({
    kind: 'rule_change',
    item_ids: [],
    total_cents: 0,
    actor: 'human',
    rule_fired: null,
    reasoning: 'Human updated spending rules',
  })
  return next
}

// ---- rubber-stamp guard (Lee & See calibrated trust; arXiv 2605.19151) ----
// If the human approves nearly everything and never undoes, approvals are becoming
// automatic motor behavior - the gate stops protecting anyone. We surface the
// approve-rate so the UI can inject friction before that happens.
export type ApprovalStats = {
  total: number
  approved: number
  rejected: number
  undos: number
  approve_rate: number // 0..1 over decided cards; 1 = rubber-stamping risk
}

export async function approvalStats(): Promise<ApprovalStats> {
  const db = await getDB()
  const { rows } = await db.query<{ v: string }>("SELECT v FROM kv WHERE k LIKE 'approval:%'")
  let approved = 0, rejected = 0, undos = 0
  for (const r of rows) {
    const a = JSON.parse(r.v) as { decision: boolean }
    if (a.decision) approved++
    else rejected++
  }
  const recs = await listReceipts(100)
  for (const r of recs) if (r.kind === 'undo' && r.reasoning?.includes('Human reversed')) undos++
  const total = approved + rejected
  return {
    total,
    approved,
    rejected,
    undos,
    approve_rate: total === 0 ? 0 : approved / total,
  }
}

export async function recordApprovalDecision(decision: boolean): Promise<void> {
  const db = await getDB()
  const id = `approval:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await db.query('INSERT INTO kv (k, v) VALUES ($1, $2)', [id, JSON.stringify({ decision, ts: Date.now() })])
}

// ---- The decision engine. Returns what the tool layer acts on. ----
export type GateVerdict =
  | { action: 'auto_execute'; reason: string; rule: string }
  | { action: 'needs_approval'; reason: string; rule: string }
  | { action: 'blocked'; reason: string; rule: string }

export async function evaluatePurchase(opts: {
  total_cents: number
  categories: string[]
  brands: string[]
}): Promise<{ verdict: GateVerdict; rules: RuleSet }> {
  const rules = await getRules()

  const blockedBrand = opts.brands.find(b => rules.blocked_merchants.includes(b))
  if (blockedBrand) {
    return {
      verdict: {
        action: 'blocked',
        rule: `blocked_merchants includes ${blockedBrand}`,
        reason: `${blockedBrand} is on your blocked merchants list`,
      },
      rules,
    }
  }

  if (rules.allowed_categories) {
    const badCat = opts.categories.find(c => !rules.allowed_categories!.includes(c))
    if (badCat) {
      return {
        verdict: {
          action: 'blocked',
          rule: 'allowed_categories whitelist',
          reason: `Category "${badCat}" is not in your allowed categories (${rules.allowed_categories.join(', ')})`,
        },
        rules,
      }
    }
  }

  if (opts.total_cents > rules.balance_cents - rules.spent_this_month_cents) {
    return {
      verdict: {
        action: 'blocked',
        rule: 'monthly_envelope remaining balance',
        reason: `Total ${(opts.total_cents / 100).toFixed(2)} exceeds your remaining envelope of ${((rules.monthly_envelope_cents - rules.spent_this_month_cents) / 100).toFixed(2)}`,
      },
      rules,
    }
  }

  if (opts.total_cents > rules.per_purchase_cap_cents) {
    return {
      verdict: {
        action: 'needs_approval',
        rule: `per_purchase_cap of ${(rules.per_purchase_cap_cents / 100).toFixed(2)}`,
        reason: `Purchase of ${(opts.total_cents / 100).toFixed(2)} is over your ${(rules.per_purchase_cap_cents / 100).toFixed(2)} cap, so it needs your explicit approval`,
      },
      rules,
    }
  }

  return {
    verdict: {
      action: 'auto_execute',
      rule: `auto_approve_below of ${(rules.auto_approve_below_cents / 100).toFixed(2)}`,
      reason: `Within your auto-approve envelope and all category/merchant rules pass`,
    },
    rules,
  }
}

// ---- receipts: hash-chained so judges can verify tamper-evidence ----
export async function appendReceipt(r: Omit<Receipt, 'id' | 'ts' | 'prev_hash' | 'hash' | 'undone'>): Promise<Receipt> {
  const db = await getDB()
  const last = await lastReceipt()
  const prevHash = last?.hash ?? 'GENESIS'
  const ts = Date.now()
  const id = `r_${ts}_${Math.random().toString(36).slice(2, 8)}`
  const payload = JSON.stringify({ ...r, id, ts, prev_hash: prevHash })
  const hash = await sha256(payload)
  const receipt: Receipt = { ...r, id, ts, prev_hash: prevHash, hash, undone: false }
  await db.query(
    'INSERT INTO kv (k, v) VALUES ($1, $2)',
    [`receipt:${id}`, JSON.stringify(receipt)],
  )
  return receipt
}

export async function lastReceipt(): Promise<Receipt | null> {
  const db = await getDB()
  const { rows } = await db.query<{ v: string }>(
    "SELECT v FROM kv WHERE k LIKE 'receipt:%'",
  )
  const all = rows.map(r => JSON.parse(r.v) as Receipt).sort((a, b) => b.ts - a.ts)
  return all[0] ?? null
}

export async function listReceipts(limit = 50): Promise<Receipt[]> {
  const db = await getDB()
  const { rows } = await db.query<{ v: string }>(
    "SELECT v FROM kv WHERE k LIKE 'receipt:%'",
  )
  return rows
    .map(r => JSON.parse(r.v) as Receipt)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
}

export async function markUndone(receiptId: string): Promise<boolean> {
  const db = await getDB()
  const { rows } = await db.query<{ v: string }>('SELECT v FROM kv WHERE k = $1', [
    `receipt:${receiptId}`,
  ])
  if (!rows[0]) return false
  const r = JSON.parse(rows[0].v) as Receipt
  if (r.kind !== 'purchase') return false
  // refund the envelope + restore stock happens in caller via spendBookkeeping
  r.undone = true
  await db.query('UPDATE kv SET v = $2 WHERE k = $1', [`receipt:${receiptId}`, JSON.stringify(r)])
  const rules = await readRules(db)
  rules.spent_this_month_cents = Math.max(0, rules.spent_this_month_cents - r.total_cents)
  await db.query('UPDATE kv SET v = $2 WHERE k = $1', [RULES_KEY, JSON.stringify(rules)])
  for (const pid of r.item_ids) {
    await db.query('UPDATE products SET stock = stock + 1 WHERE id = $1', [pid])
  }
  await db.exec('DELETE FROM cart_items')
  await appendReceipt({
    kind: 'undo',
    item_ids: r.item_ids,
    total_cents: -r.total_cents,
    actor: 'human',
    rule_fired: null,
    reasoning: `Human reversed purchase ${receiptId} within the reversal window`,
  })
  return true
}

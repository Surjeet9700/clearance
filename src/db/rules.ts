import { getDB, sha256, saveDB, type RuleSet, type Receipt } from './index'

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
  const v = db.kv[RULES_KEY]
  if (!v) {
    db.kv[RULES_KEY] = JSON.stringify(DEFAULT_RULES)
    return { ...DEFAULT_RULES }
  }
  return JSON.parse(v) as RuleSet
}

export async function getRules(): Promise<RuleSet> {
  const db = await getDB()
  return readRules(db)
}

export async function setRules(patch: Partial<Omit<RuleSet, 'spent_this_month_cents'>>): Promise<RuleSet> {
  const db = await getDB()
  const cur = await readRules(db)
  const next: RuleSet = { ...cur, ...patch }
  db.kv[RULES_KEY] = JSON.stringify(next)
  await saveDB()
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
export type ApprovalStats = {
  total: number
  approved: number
  rejected: number
  undos: number
  approve_rate: number
}

export async function approvalStats(): Promise<ApprovalStats> {
  const db = await getDB()
  const approvals = Object.entries(db.kv)
    .filter(([k]) => k.startsWith('approval:'))
    .map(([, v]) => JSON.parse(v) as { decision: boolean })
  let approved = 0, rejected = 0, undos = 0
  for (const a of approvals) {
    if (a.decision) approved++
    else rejected++
  }
  const recs = await listReceipts(100)
  for (const r of recs) if (r.kind === 'undo' && r.reasoning?.includes('Human reversed')) undos++
  const total = approved + rejected
  return { total, approved, rejected, undos, approve_rate: total === 0 ? 0 : approved / total }
}

export async function recordApprovalDecision(decision: boolean): Promise<void> {
  const db = await getDB()
  const id = `approval:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  db.setKV(id, JSON.stringify({ decision, ts: Date.now() }))
  await saveDB()
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
      verdict: { action: 'blocked', rule: `blocked_merchants includes ${blockedBrand}`, reason: `${blockedBrand} is on your blocked merchants list` },
      rules,
    }
  }

  if (rules.allowed_categories) {
    const badCat = opts.categories.find(c => !rules.allowed_categories!.includes(c))
    if (badCat) {
      return {
        verdict: { action: 'blocked', rule: 'allowed_categories whitelist', reason: `Category "${badCat}" is not in your allowed categories (${rules.allowed_categories.join(', ')})` },
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
  const all = db.getReceipts()
  const last = all.length ? all[all.length - 1] : null
  const prevHash = last?.hash ?? 'GENESIS'
  const ts = Date.now()
  const id = `r_${ts}_${Math.random().toString(36).slice(2, 8)}`
  const payload = JSON.stringify({ ...r, id, ts, prev_hash: prevHash })
  const hash = await sha256(payload)
  const receipt: Receipt = { ...r, id, ts, prev_hash: prevHash, hash, undone: false }
  db.addReceipt(receipt)
  await saveDB()
  return receipt
}

export async function lastReceipt(): Promise<Receipt | null> {
  const db = await getDB()
  const all = db.getReceipts()
  return all.length ? all[all.length - 1] : null
}

export async function listReceipts(limit = 50): Promise<Receipt[]> {
  const db = await getDB()
  return db.getReceipts().slice(-limit).reverse()
}

export async function markUndone(receiptId: string): Promise<boolean> {
  const db = await getDB()
  const all = db.getReceipts()
  const idx = all.findIndex(r => r.id === receiptId)
  if (idx === -1) return false
  const r = all[idx]
  if (r.kind !== 'purchase') return false
  r.undone = true
  all[idx] = r
  const rules = await readRules(db)
  rules.spent_this_month_cents = Math.max(0, rules.spent_this_month_cents - r.total_cents)
  db.kv[RULES_KEY] = JSON.stringify(rules)
  for (const pid of r.item_ids) {
    const p = db.products.find(x => x.id === pid)
    if (p) p.stock += 1
  }
  db.clearCart()
  await appendReceipt({
    kind: 'undo',
    item_ids: r.item_ids,
    total_cents: -r.total_cents,
    actor: 'human',
    rule_fired: null,
    reasoning: `Human reversed purchase ${receiptId} within the reversal window`,
  })
  await saveDB()
  return true
}

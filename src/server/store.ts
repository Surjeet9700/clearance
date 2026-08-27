import { getDB, sha256 } from '~/db'
import { listReceipts, lastReceipt } from '~/db/rules'

// chain verification endpoint - judges can prove receipts are tamper-evident
export const verifyChain = async () => {
  const db = await getDB()
  const receipts = db.getReceipts()
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
}

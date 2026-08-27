import { f as getDB, p as sha256, s as lastReceipt } from "./router-BPlAlR6Q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-BCietIqV.js
var verifyChain = async () => {
	const receipts = (await getDB()).getReceipts();
	let prevHash = "GENESIS";
	for (const r of [...receipts].sort((a, b) => a.ts - b.ts)) {
		if (await sha256(JSON.stringify({
			kind: r.kind,
			item_ids: r.item_ids,
			total_cents: r.total_cents,
			actor: r.actor,
			rule_fired: r.rule_fired,
			reasoning: r.reasoning,
			id: r.id,
			ts: r.ts,
			prev_hash: prevHash
		})) !== r.hash || r.prev_hash !== prevHash) return {
			valid: false,
			broken_at: r.id
		};
		prevHash = r.hash;
	}
	return {
		valid: true,
		length: receipts.length,
		head: (await lastReceipt())?.hash
	};
};
//#endregion
export { verifyChain };

import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, z as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/receipts-BI_TXeG6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KIND_STYLE = {
	purchase: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
	undo: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	blocked: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
	rule_change: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
};
function Receipts() {
	const [receipts, setReceipts] = import_react.useState(null);
	const [chain, setChain] = import_react.useState(null);
	const load = import_react.useCallback(() => {
		fetch("/api/receipts").then((r) => r.json()).then(setReceipts).catch(() => setReceipts([]));
		fetch("/api/verify").then((r) => r.json()).then(setChain).catch(() => {});
	}, []);
	import_react.useEffect(() => {
		load();
		const h = () => load();
		window.addEventListener("cart-changed", h);
		const t = setInterval(h, 5e3);
		return () => {
			window.removeEventListener("cart-changed", h);
			clearInterval(t);
		};
	}, [load]);
	const undo = async (id) => {
		await fetch("/api/undo", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ receipt_id: id })
		});
		load();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold tracking-tight",
				children: "Receipt ledger"
			}), chain && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `rounded-full px-3 py-1 text-xs font-medium ${chain.valid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700"}`,
				children: chain.valid ? `✓ chain valid · ${chain.length} entries` : "✗ chain broken"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400",
			children: "Every agent action lands here, hash-chained so nothing can be quietly edited. Purchases can be reversed for 5 minutes."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-4 space-y-2",
			children: [(receipts ?? []).map((r) => {
				const reversible = r.kind === "purchase" && !r.undone && Date.now() - r.ts < 3e5;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `rounded px-1.5 py-0.5 font-mono text-[11px] uppercase ${KIND_STYLE[r.kind]}`,
									children: r.kind
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-neutral-500",
									children: [
										r.actor === "agent" ? "🤖 agent" : "👤 you",
										" · ",
										new Date(r.ts).toLocaleTimeString()
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-auto font-mono text-sm font-semibold",
									children: [
										r.total_cents < 0 ? "+" : "",
										"$",
										(Math.abs(r.total_cents) / 100).toFixed(2)
									]
								})
							]
						}),
						r.rule_fired && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-neutral-500",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-neutral-700 dark:text-neutral-300",
									children: "rule:"
								}),
								" ",
								r.rule_fired
							]
						}),
						r.reasoning && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-neutral-500",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-neutral-700 dark:text-neutral-300",
									children: "why:"
								}),
								" ",
								r.reasoning
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1.5 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", {
								className: "text-[10px] text-neutral-400",
								children: [
									r.id,
									" · ",
									r.hash.slice(0, 12),
									"…",
									r.undone ? " · REVERSED" : ""
								]
							}), reversible && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => undo(r.id),
								className: "rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-400",
								children: [
									"undo (",
									Math.max(0, Math.ceil((3e5 - (Date.now() - r.ts)) / 6e4)),
									"m left)"
								]
							})]
						})
					]
				}, r.id);
			}), receipts && receipts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700",
				children: "No activity yet. Ask your agent to shop — everything it does shows up here."
			})]
		})
	] });
}
//#endregion
export { Receipts as component };

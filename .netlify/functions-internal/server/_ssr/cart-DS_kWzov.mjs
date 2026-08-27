import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, z as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cart-DS_kWzov.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Cart() {
	const [lines, setLines] = import_react.useState([]);
	const [busy, setBusy] = import_react.useState(false);
	const load = import_react.useCallback(() => {
		fetch("/api/cart").then((r) => r.json()).then(setLines).catch(() => setLines([]));
	}, []);
	import_react.useEffect(() => {
		load();
		const h = () => load();
		window.addEventListener("cart-changed", h);
		return () => window.removeEventListener("cart-changed", h);
	}, [load]);
	const total = lines.reduce((s, l) => s + l.price_cents * l.qty, 0);
	const remove = async (product_id) => {
		if (busy) return;
		setBusy(true);
		setLines((cur) => cur.filter((l) => l.product_id !== product_id));
		try {
			await fetch(`/api/cart/${product_id}`, { method: "DELETE" });
		} finally {
			setBusy(false);
			load();
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-bold tracking-tight",
			children: "Cart"
		}),
		lines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 text-sm text-neutral-600 dark:text-neutral-400",
			children: "Empty. Add something from the store, or let your agent do it."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900",
			children: lines.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between gap-3 px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-medium",
					children: [
						l.name,
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-neutral-500",
							children: ["× ", l.qty]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-neutral-500",
					children: [
						l.brand,
						" · ",
						l.category
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-sm",
						children: ["$", (l.price_cents * l.qty / 100).toFixed(2)]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => remove(l.product_id),
						className: "text-xs text-red-500 hover:underline",
						children: "remove"
					})]
				})]
			}, l.product_id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm text-neutral-600 dark:text-neutral-400",
				children: "Total"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-mono text-lg font-semibold",
				children: ["$", (total / 100).toFixed(2)]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-xs text-neutral-500",
			children: "Checkout runs through your rules. The agent can check out on its own only inside your auto-approve envelope."
		})
	] });
}
//#endregion
export { Cart as component };

import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, z as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CR3xpXC7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Store() {
	const [products, setProducts] = import_react.useState(null);
	const [adding, setAdding] = import_react.useState(null);
	const [added, setAdded] = import_react.useState(null);
	const [reviewsFor, setReviewsFor] = import_react.useState(null);
	const [reviews, setReviews] = import_react.useState([]);
	const load = import_react.useCallback(() => {
		fetch("/api/products").then((r) => r.json()).then(setProducts).catch(() => setProducts([]));
	}, []);
	import_react.useEffect(load, [load]);
	const add = async (id) => {
		setAdding(id);
		try {
			await fetch("/api/cart", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ product_id: id })
			});
			setAdded(id);
			window.dispatchEvent(new CustomEvent("cart-changed"));
			setTimeout(() => setAdded((cur) => cur === id ? null : cur), 2e3);
		} finally {
			setAdding(null);
		}
	};
	const toggleReviews = async (id) => {
		if (reviewsFor === id) {
			setReviewsFor(null);
			return;
		}
		setReviewsFor(id);
		setReviews([]);
		try {
			const r = await fetch(`/api/reviews/${id}`);
			setReviews(await r.json());
		} catch {
			setReviews([]);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-bold tracking-tight",
			children: "Store"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400",
			children: "Browse normally, or ask your agent to shop for you. Either way the rules engine watches every purchase."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: (products ?? Array.from({ length: 6 }, () => null)).map((p, i) => p ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
				children: [p.img && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: p.img,
						alt: p.name,
						loading: "lazy",
						className: "h-full w-full object-cover"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-1 flex-col p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold leading-tight",
								children: p.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-neutral-500",
								children: [
									p.brand,
									" · ",
									p.category
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
								children: ["$", (p.price_cents / 100).toFixed(2)]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400",
							children: p.blurb
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center justify-between text-xs text-neutral-500",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => toggleReviews(p.id),
								className: "underline decoration-dotted hover:text-emerald-600",
								children: [
									"★ ",
									p.rating,
									" · reviews"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [p.stock, " in stock"] })]
						}),
						reviewsFor === p.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-2 space-y-1.5 rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
							children: reviews.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "italic",
								children: "No reviews yet."
							}) : reviews.map((r, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-neutral-800 dark:text-neutral-200",
									children: r.author
								}),
								" (",
								r.rating,
								"): ",
								r.text
							] }, j))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => add(p.id),
							disabled: adding === p.id || added === p.id || p.stock < 1,
							className: `mt-3 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-100 ${added === p.id ? "bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-500"} disabled:opacity-40`,
							children: p.stock < 1 ? "Out of stock" : adding === p.id ? "Adding…" : added === p.id ? "✓ Added to cart" : "Add to cart"
						})
					]
				})]
			}, p.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-72 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" }, i))
		})
	] });
}
//#endregion
export { Store as component };

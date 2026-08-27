import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, z as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rules-BH73UTQg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATEGORIES = [
	"running",
	"outdoor",
	"casual",
	"gym",
	"court",
	"apparel",
	"kitchen"
];
var BRANDS = [
	"Velocity",
	"Summit",
	"Nimbus",
	"IronCore",
	"Rally",
	"NorthLoop",
	"ForgeWorks"
];
function Rules() {
	const [rules, setRules] = import_react.useState(null);
	const [saving, setSaving] = import_react.useState(false);
	import_react.useEffect(() => {
		fetch("/api/rules").then((r) => r.json()).then(setRules).catch(() => {});
	}, []);
	if (!rules) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-neutral-500",
		children: "Loading rules…"
	});
	const remaining = rules.monthly_envelope_cents - rules.spent_this_month_cents;
	const save = async () => {
		setSaving(true);
		await fetch("/api/rules-save", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(rules)
		}).catch(() => {});
		setSaving(false);
	};
	const toggle = (arr, v) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold tracking-tight",
				children: "Spending rules"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-neutral-600 dark:text-neutral-400",
				children: "These rules bind your agent. Purchases inside the envelope flow silently into receipts; anything unusual stops and asks you."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300",
								children: "Monthly envelope"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-2xl font-bold",
								children: [
									"$",
									(remaining / 100).toFixed(2),
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-sm font-normal text-emerald-700/70 dark:text-emerald-400/70",
										children: ["left of $", (rules.monthly_envelope_cents / 100).toFixed(2)]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 50,
								max: 500,
								step: 10,
								value: rules.monthly_envelope_cents / 100,
								onChange: (e) => setRules({
									...rules,
									monthly_envelope_cents: Number(e.target.value) * 100
								}),
								className: "mt-2 w-full accent-emerald-600"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium uppercase tracking-wide text-neutral-500",
									children: "Auto-approve below"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 flex items-center gap-2",
									children: ["$", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										max: 100,
										value: rules.auto_approve_below_cents / 100,
										onChange: (e) => setRules({
											...rules,
											auto_approve_below_cents: Number(e.target.value) * 100
										}),
										className: "w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-neutral-500",
									children: "Agent buys freely at or under this"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium uppercase tracking-wide text-neutral-500",
									children: "Approval cap"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 flex items-center gap-2",
									children: ["$", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										max: 500,
										value: rules.per_purchase_cap_cents / 100,
										onChange: (e) => setRules({
											...rules,
											per_purchase_cap_cents: Number(e.target.value) * 100
										}),
										className: "w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-neutral-500",
									children: "Above this the agent must ask you first"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "px-1 text-xs font-medium uppercase tracking-wide text-neutral-500",
								children: "Allowed categories"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-xs text-neutral-500",
								children: rules.allowed_categories === null ? "All categories allowed" : `${rules.allowed_categories.length} selected`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: CATEGORIES.map((c) => {
									const active = rules.allowed_categories === null || rules.allowed_categories.includes(c);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											const cur = rules.allowed_categories ?? CATEGORIES.filter((x) => x !== c);
											const next = cur.includes(c) && !(cur.length === CATEGORIES.length) ? cur.filter((x) => x !== c) : [.../* @__PURE__ */ new Set([...cur, c])];
											setRules({
												...rules,
												allowed_categories: next
											});
										},
										className: `rounded-full border px-3 py-1 text-xs ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"}`,
										children: c
									}, c);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setRules({
									...rules,
									allowed_categories: null
								}),
								className: "mt-2 text-xs text-neutral-500 underline",
								children: "allow all categories"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
							className: "px-1 text-xs font-medium uppercase tracking-wide text-neutral-500",
							children: "Blocked merchants"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: BRANDS.map((b) => {
								const blocked = rules.blocked_merchants.includes(b);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setRules({
										...rules,
										blocked_merchants: toggle(rules.blocked_merchants, b)
									}),
									className: `rounded-full border px-3 py-1 text-xs ${blocked ? "border-red-500 bg-red-500 text-white line-through" : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"}`,
									children: b
								}, b);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: save,
						disabled: saving,
						className: "rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40",
						children: saving ? "Saving…" : "Save rules"
					})
				]
			})
		]
	});
}
//#endregion
export { Rules as component };

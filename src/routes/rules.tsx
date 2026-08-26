import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/rules')({
  component: Rules,
})

type RuleSet = {
  balance_cents: number
  spent_this_month_cents: number
  monthly_envelope_cents: number
  per_purchase_cap_cents: number
  auto_approve_below_cents: number
  allowed_categories: string[] | null
  blocked_merchants: string[]
}

const CATEGORIES = ['running', 'outdoor', 'casual', 'gym', 'court', 'apparel', 'kitchen']
const BRANDS = ['Velocity', 'Summit', 'Nimbus', 'IronCore', 'Rally', 'NorthLoop', 'ForgeWorks']

function Rules() {
  const [rules, setRules] = React.useState<RuleSet | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/rules').then(r => r.json()).then(setRules).catch(() => {})
  }, [])

  if (!rules) return <p className="text-sm text-neutral-500">Loading rules…</p>

  const remaining = rules.monthly_envelope_cents - rules.spent_this_month_cents

  const save = async () => {
    setSaving(true)
    await fetch('/api/rules-save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rules),
    }).catch(() => {})
    setSaving(false)
  }

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Spending rules</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        These rules bind your agent. Purchases inside the envelope flow silently into receipts; anything unusual stops and asks you.
      </p>

      <div className="mt-6 space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Monthly envelope</p>
          <p className="mt-1 font-mono text-2xl font-bold">${(remaining / 100).toFixed(2)} <span className="text-sm font-normal text-emerald-700/70 dark:text-emerald-400/70">left of ${(rules.monthly_envelope_cents / 100).toFixed(2)}</span></p>
          <input
            type="range" min={50} max={500} step={10} value={rules.monthly_envelope_cents / 100}
            onChange={e => setRules({ ...rules, monthly_envelope_cents: Number(e.target.value) * 100 })}
            className="mt-2 w-full accent-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Auto-approve below</span>
            <div className="mt-1 flex items-center gap-2">
              $<input type="number" min={0} max={100} value={rules.auto_approve_below_cents / 100}
                onChange={e => setRules({ ...rules, auto_approve_below_cents: Number(e.target.value) * 100 })}
                className="w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Agent buys freely at or under this</p>
          </label>

          <label className="block rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Approval cap</span>
            <div className="mt-1 flex items-center gap-2">
              $<input type="number" min={0} max={500} value={rules.per_purchase_cap_cents / 100}
                onChange={e => setRules({ ...rules, per_purchase_cap_cents: Number(e.target.value) * 100 })}
                className="w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Above this the agent must ask you first</p>
          </label>
        </div>

        <fieldset className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Allowed categories</legend>
          <p className="mb-2 text-xs text-neutral-500">{rules.allowed_categories === null ? 'All categories allowed' : `${rules.allowed_categories.length} selected`}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => {
              const active = rules.allowed_categories === null || rules.allowed_categories.includes(c)
              return (
                <button key={c}
                  onClick={() => {
                    const cur = rules.allowed_categories ?? CATEGORIES.filter(x => x !== c)
                    // clicking when whitelist is null starts a whitelist of everything-except-clicked? No:
                    // start from full list minus nothing; simplest: toggle within explicit list
                    const next = cur.includes(c) && !(cur.length === CATEGORIES.length)
                      ? cur.filter(x => x !== c)
                      : [...new Set([...cur, c])]
                    setRules({ ...rules, allowed_categories: next })
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'}`}>
                  {c}
                </button>
              )
            })}
          </div>
          <button onClick={() => setRules({ ...rules, allowed_categories: null })} className="mt-2 text-xs text-neutral-500 underline">allow all categories</button>
        </fieldset>

        <fieldset className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Blocked merchants</legend>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map(b => {
              const blocked = rules.blocked_merchants.includes(b)
              return (
                <button key={b}
                  onClick={() => setRules({ ...rules, blocked_merchants: toggle(rules.blocked_merchants, b) })}
                  className={`rounded-full border px-3 py-1 text-xs ${blocked ? 'border-red-500 bg-red-500 text-white line-through' : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'}`}>
                  {b}
                </button>
              )
            })}
          </div>
        </fieldset>

        <button onClick={save} disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
          {saving ? 'Saving…' : 'Save rules'}
        </button>
      </div>
    </div>
  )
}

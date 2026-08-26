import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/receipts')({
  component: Receipts,
})

type Receipt = {
  id: string
  ts: number
  kind: 'purchase' | 'undo' | 'blocked' | 'rule_change'
  item_ids: number[]
  total_cents: number
  actor: 'agent' | 'human'
  rule_fired: string | null
  reasoning: string | null
  hash: string
  undone: boolean
}

const KIND_STYLE: Record<Receipt['kind'], string> = {
  purchase: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  undo: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  blocked: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  rule_change: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function Receipts() {
  const [receipts, setReceipts] = React.useState<Receipt[] | null>(null)
  const [chain, setChain] = React.useState<{ valid: boolean; length: number } | null>(null)

  const load = React.useCallback(() => {
    fetch('/api/receipts').then(r => r.json()).then(setReceipts).catch(() => setReceipts([]))
    fetch('/api/verify').then(r => r.json()).then(setChain).catch(() => {})
  }, [])

  React.useEffect(() => {
    load()
    const h = () => load()
    window.addEventListener('cart-changed', h)
    const t = setInterval(h, 5000) // live ledger: agent actions appear on their own
    return () => {
      window.removeEventListener('cart-changed', h)
      clearInterval(t)
    }
  }, [load])

  const undo = async (id: string) => {
    await fetch('/api/undo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ receipt_id: id }),
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Receipt ledger</h1>
        {chain && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${chain.valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>
            {chain.valid ? `✓ chain valid · ${chain.length} entries` : '✗ chain broken'}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every agent action lands here, hash-chained so nothing can be quietly edited. Purchases can be reversed for 5 minutes.
      </p>

      <ul className="mt-4 space-y-2">
        {(receipts ?? []).map(r => {
          const reversible = r.kind === 'purchase' && !r.undone && Date.now() - r.ts < 5 * 60 * 1000
          return (
            <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] uppercase ${KIND_STYLE[r.kind]}`}>{r.kind}</span>
                <span className="text-xs text-neutral-500">{r.actor === 'agent' ? '🤖 agent' : '👤 you'} · {new Date(r.ts).toLocaleTimeString()}</span>
                <span className="ml-auto font-mono text-sm font-semibold">
                  {r.total_cents < 0 ? '+' : ''}${(Math.abs(r.total_cents) / 100).toFixed(2)}
                </span>
              </div>
              {r.rule_fired && <p className="mt-1 text-xs text-neutral-500"><span className="font-medium text-neutral-700 dark:text-neutral-300">rule:</span> {r.rule_fired}</p>}
              {r.reasoning && <p className="text-xs text-neutral-500"><span className="font-medium text-neutral-700 dark:text-neutral-300">why:</span> {r.reasoning}</p>}
              <div className="mt-1.5 flex items-center justify-between">
                <code className="text-[10px] text-neutral-400">{r.id} · {r.hash.slice(0, 12)}…{r.undone ? ' · REVERSED' : ''}</code>
                {reversible && (
                  <button onClick={() => undo(r.id)} className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-400">
                    undo ({Math.max(0, Math.ceil((5 * 60 * 1000 - (Date.now() - r.ts)) / 60000))}m left)
                  </button>
                )}
              </div>
            </li>
          )
        })}
        {receipts && receipts.length === 0 && (
          <li className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No activity yet. Ask your agent to shop — everything it does shows up here.
          </li>
        )}
      </ul>
    </div>
  )
}

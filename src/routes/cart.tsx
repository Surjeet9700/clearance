import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/cart')({
  component: Cart,
})

type CartLine = {
  product_id: number
  qty: number
  name: string
  brand: string
  category: string
  price_cents: number
}

function Cart() {
  const [lines, setLines] = React.useState<CartLine[]>([])
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(() => {
    fetch('/api/cart')
      .then(r => r.json())
      .then(setLines)
      .catch(() => setLines([]))
  }, [])

  React.useEffect(() => {
    load()
    const h = () => load()
    window.addEventListener('cart-changed', h)
    return () => window.removeEventListener('cart-changed', h)
  }, [load])

  const total = lines.reduce((s, l) => s + l.price_cents * l.qty, 0)
  const remove = async (product_id: number) => {
    if (busy) return
    setBusy(true)
    // optimistic: drop the line immediately so rapid clicks can't race on stale state
    setLines(cur => cur.filter(l => l.product_id !== product_id))
    try {
      await fetch(`/api/cart/${product_id}`, { method: 'DELETE' })
    } finally {
      setBusy(false)
      load()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Cart</h1>
      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Empty. Add something from the store, or let your agent do it.</p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {lines.map(l => (
            <li key={l.product_id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{l.name} <span className="text-xs text-neutral-500">× {l.qty}</span></p>
                <p className="text-xs text-neutral-500">{l.brand} · {l.category}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">${((l.price_cents * l.qty) / 100).toFixed(2)}</span>
                <button onClick={() => remove(l.product_id)} className="text-xs text-red-500 hover:underline">remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Total</span>
        <span className="font-mono text-lg font-semibold">${(total / 100).toFixed(2)}</span>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Checkout runs through your rules. The agent can check out on its own only inside your auto-approve envelope.
      </p>
    </div>
  )
}

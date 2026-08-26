import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/')({
  component: Store,
})

type Product = {
  id: number
  name: string
  brand: string
  category: string
  price_cents: number
  rating: number
  stock: number
  blurb: string
}

function Store() {
  const [products, setProducts] = React.useState<Product[] | null>(null)
  const [adding, setAdding] = React.useState<number | null>(null)

  const load = React.useCallback(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  React.useEffect(load, [load])

  const add = async (id: number) => {
    setAdding(id)
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product_id: id }),
    })
    setAdding(null)
    window.dispatchEvent(new CustomEvent('cart-changed'))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Store</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Browse normally, or ask your agent to shop for you. Either way the rules engine watches every purchase.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(products ?? Array.from({ length: 6 }, () => null)).map((p, i) =>
          p ? (
            <div key={p.id} className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold leading-tight">{p.name}</h2>
                  <p className="text-xs text-neutral-500">{p.brand} · {p.category}</p>
                </div>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  ${(p.price_cents / 100).toFixed(2)}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{p.blurb}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>★ {p.rating}</span>
                <span>{p.stock} in stock</span>
              </div>
              <button
                onClick={() => add(p.id)}
                disabled={adding === p.id || p.stock < 1}
                className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {p.stock < 1 ? 'Out of stock' : adding === p.id ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          ) : (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          ),
        )}
      </div>
    </div>
  )
}

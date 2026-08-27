import { createFileRoute } from '@tanstack/react-router'
import { getDB, saveDB } from '~/db'
import { getRules, listReceipts, markUndone, approvalStats, recordApprovalDecision } from '~/db/rules'
import { handleCheckout } from '~/server/checkout-rest'

// REST surface so the UI talks to the same server-side DB the agent tools use.
// Server routes per TanStack Start docs: createFileRoute + server.handlers.

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname.replace(/^\/api/, '')
        const db = await getDB()

        if (path === '/products') {
          return json(db.products)
        }
        if (path.startsWith('/reviews/')) {
          const pid = Number(path.split('/')[2])
          return json(db.reviews.filter(r => r.product_id === pid))
        }
        if (path === '/rules') return json(await getRules())
        if (path === '/receipts') return json(await listReceipts())
        if (path === '/approval-stats') return json(await approvalStats())
        if (path === '/verify') {
          const { verifyChain } = await import('~/server/store')
          return json(await verifyChain())
        }
        if (path === '/cart') {
          return json(
            db.cart.map(ci => {
              const p = db.products.find(x => x.id === ci.product_id)!
              return { product_id: p.id, qty: ci.qty, name: p.name, brand: p.brand, category: p.category, price_cents: p.price_cents }
            }),
          )
        }
        return json({ error: 'Not found' }, 404)
      },
      POST: async ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname.replace(/^\/api/, '')
        const db = await getDB()
        const body = await request.json().catch(() => ({}) as Record<string, unknown>)

        if (path === '/cart') {
          const b = body as { product_id: number; qty?: number }
          const prod = db.products.find(x => x.id === b.product_id)
          if (!prod) return json({ error: 'Product not found' }, 404)
          db.addToCart(b.product_id, b.qty ?? 1)
          await saveDB()
          return json(
            db.cart.map(ci => {
              const p = db.products.find(x => x.id === ci.product_id)!
              return { product_id: p.id, qty: ci.qty, name: p.name, brand: p.brand, category: p.category, price_cents: p.price_cents }
            }),
          )
        }

        if (path === '/undo') {
          const b = body as { receipt_id: string }
          const ok = await markUndone(b.receipt_id)
          return json({ ok })
        }

        if (path === '/approval-decision') {
          const b = body as { decision: boolean }
          await recordApprovalDecision(b.decision)
          return json({ ok: true })
        }

        if (path === '/rules-save') {
          const b = body as Record<string, unknown>
          const { setRules } = await import('~/db/rules')
          // accept the full RuleSet shape from the UI, strip read-only fields server-side
          const { spent_this_month_cents, ...patch } = b as never as { spent_this_month_cents: number } & Record<string, unknown>
          const next = await setRules(patch)
          return json(next)
        }

        if (path === '/checkout') {
          const b = body as { reasoning?: string; actor?: 'agent' | 'human'; idempotency_key?: string }
          return json(await handleCheckout(b))
        }

        return json({ error: 'Not found' }, 404)
      },
      DELETE: async ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname.replace(/^\/api/, '')
        const db = await getDB()
        if (path === '/cart') {
          db.clearCart()
          await saveDB()
          return json({ ok: true })
        }
        // remove a single product line: DELETE /api/cart/<id>
        const m = path.match(/^\/cart\/(\d+)$/)
        if (m) {
          db.removeFromCart(Number(m[1]))
          await saveDB()
          return json({ ok: true })
        }
        return json({ error: 'Not found' }, 404)
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/db'
import { getRules, listReceipts, markUndone } from '~/db/rules'
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
          const { rows } = await db.query('SELECT * FROM products ORDER BY id')
          return json(rows)
        }
        if (path === '/rules') return json(await getRules())
        if (path === '/receipts') return json(await listReceipts())
        if (path === '/verify') {
          const { verifyChain } = await import('~/server/store')
          return json(await verifyChain())
        }
        if (path === '/cart') {
          const { rows } = await db.query(
            `SELECT ci.product_id, ci.qty, p.name, p.brand, p.category, p.price_cents
             FROM cart_items ci JOIN products p ON p.id = ci.product_id ORDER BY ci.id`,
          )
          return json(rows)
        }
        return json({ error: 'Not found' }, 404)
      },
      POST: async ({ request }: { request: Request }) => {
        const path = new URL(request.url).pathname.replace(/^\/api/, '')
        const db = await getDB()
        const body = await request.json().catch(() => ({}) as Record<string, unknown>)

        if (path === '/cart') {
          const b = body as { product_id: number; qty?: number }
          const { rows: prod } = await db.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [b.product_id])
          if (!prod[0]) return json({ error: 'Product not found' }, 404)
          await db.query(
            `INSERT INTO cart_items (product_id, qty)
             SELECT $1, $2
             WHERE NOT EXISTS (SELECT 1 FROM cart_items WHERE product_id = $1)`,
            [b.product_id, b.qty ?? 1],
          )
          const { rows } = await db.query(
            `SELECT ci.product_id, ci.qty, p.name, p.brand, p.category, p.price_cents
             FROM cart_items ci JOIN products p ON p.id = ci.product_id ORDER BY ci.id`,
          )
          return json(rows)
        }

        if (path === '/undo') {
          const b = body as { receipt_id: string }
          const ok = await markUndone(b.receipt_id)
          return json({ ok })
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
          await db.exec('DELETE FROM cart_items')
          return json({ ok: true })
        }
        return json({ error: 'Not found' }, 404)
      },
    },
  },
})

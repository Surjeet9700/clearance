import { createFileRoute } from '@tanstack/react-router'
import { evaluatePurchase, getRules } from '~/db/rules'

export const Route = createFileRoute('/api/test-gate')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        const total = Number(url.searchParams.get('total') ?? 0)
        const categories = (url.searchParams.get('cats') ?? '').split(',').filter(Boolean)
        const brands = (url.searchParams.get('brands') ?? '').split(',').filter(Boolean)
        const { verdict } = await evaluatePurchase({ total_cents: total, categories, brands })
        return Response.json(verdict)
      },
    },
  },
})

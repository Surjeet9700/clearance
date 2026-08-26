import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/db'

export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: async () => {
        const db = await getDB()
        const { rows } = await db.query('SELECT * FROM products ORDER BY id')
        return Response.json(rows)
      },
    },
  },
})

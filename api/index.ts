import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import customRoutes from './custom-routes'

export const config = {
  runtime: 'nodejs'
}

const app = new Hono().basePath('/api')

app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (c.req.method === 'OPTIONS') return c.text('', 204)
  await next()
})

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

try {
  const { createAllRoutes } = await import('./src/generated')
  const { prisma } = await import('./src/lib/db')
  app.route('/', createAllRoutes(prisma))
} catch {}

app.route('/', customRoutes)

export default handle(app)

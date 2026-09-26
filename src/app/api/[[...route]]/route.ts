import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { resolveSession, Session } from '@/lib/token/resolver'
import { getCookie } from 'hono/cookie'
import { timeout } from 'hono/timeout'
import { HTTPException } from 'hono/http-exception'
import auth from '@/server/routers/auth'
import bridge from '@/server/routers/bridge'
import { env } from '@/env'

export const runtime = env.RUNTIME
export const maxDuration = 30

const app = new Hono().basePath('/api')

app.use(compress(), cors(), timeout(20000))

app.route('/auth', auth)
app.route('/', bridge)

export const GET = handle(app)
export const POST = handle(app)

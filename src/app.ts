import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import router from './routes'
import { authenticate } from './middleware/requireAuth'

const app = new Koa()

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const error = err as { status?: number; message?: string; details?: unknown }
    const status = error.status ?? 500

    console.error('Error:', {
      message: error.message,
      status,
      path: ctx.path,
      method: ctx.method,
      details: error.details,
    })

    ctx.status = status
    ctx.body = {
      error: error.message ?? 'Internal server error',
      ...(error.details ? { details: error.details } : {}),
    }

    ctx.app.emit('error', error, ctx)
  }
})

app.use(cors())
app.use(bodyParser())
app.use(authenticate)

app.use(router.routes())
app.use(router.allowedMethods())

export default app

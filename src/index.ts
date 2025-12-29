import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import router from './routes'

const app = new Koa()
const port = process.env.PORT || 3000

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err: any) {
    console.error('Error:', {
      message: err.message,
      status: err.status || 500,
      path: ctx.path,
      method: ctx.method,
    })

    ctx.status = err.status || err.statusCode || 500
    
    ctx.body = {
      error: err.message || 'Internal server error',
      ...(err.details && { details: err.details }),
    }

    ctx.app.emit('error', err, ctx)
  }
})

app.use(cors())
app.use(bodyParser())

app.use(router.routes())
app.use(router.allowedMethods())

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
    console.log(`Health check: http://localhost:${port}/health`)
  })
}

export default app

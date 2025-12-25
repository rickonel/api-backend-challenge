import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import router from './routes'

const app = new Koa()
const port = process.env.PORT || 3000

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    const error = err as Error
    console.error('Error:', error.message)
    ctx.status = 500
    ctx.body = { error: 'Internal server error' }
  }
})

// Middleware
app.use(cors())
app.use(bodyParser())

// Routes
app.use(router.routes())
app.use(router.allowedMethods())

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
  console.log(`Health check: http://localhost:${port}/health`)
})

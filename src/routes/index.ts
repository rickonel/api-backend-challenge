import Router from '@koa/router'
import tripsRouter from './trips'
import travelersRouter from './travelers'
import bookingsRouter from './bookings'
import paymentsRouter from './payments'
import authRouter from './auth'

const router = new Router()

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' }
})

// Mount entity routers
router.use(tripsRouter.routes())
router.use(tripsRouter.allowedMethods())
router.use(travelersRouter.routes())
router.use(travelersRouter.allowedMethods())
router.use(bookingsRouter.routes())
router.use(bookingsRouter.allowedMethods())
router.use(paymentsRouter.routes())
router.use(paymentsRouter.allowedMethods())
router.use(authRouter.routes())
router.use(authRouter.allowedMethods())

export default router

import Router from '@koa/router'
import { register, login, logout, me } from '../middleware/authMiddleware'
import { requireAuth } from '../middleware/requireAuth'

const router = new Router({ prefix: '/auth' })

router.post('/register', register)
router.post('/login', login)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)

export default router

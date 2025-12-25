import Router from '@koa/router'
import { getTravelers, getTraveler, createTraveler, updateTraveler, deleteTraveler } from '../middleware/travelersMiddleware'

const router = new Router({ prefix: '/travelers' })

router.get('/', getTravelers)
router.get('/:id', getTraveler)
router.post('/', createTraveler)
router.put('/:id', updateTraveler)
router.delete('/:id', deleteTraveler)

export default router

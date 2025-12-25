import Router from '@koa/router'
import { getTrips, getTrip, createTrip, updateTrip, deleteTrip } from '../middleware/tripsMiddleware'

const router = new Router({ prefix: '/trips' })

router.get('/', getTrips)
router.get('/:id', getTrip)
router.post('/', createTrip)
router.put('/:id', updateTrip)
router.delete('/:id', deleteTrip)

export default router

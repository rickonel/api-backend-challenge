import Router from '@koa/router'
import { requireAuth } from '../middleware/requireAuth'
import { 
  getTrips, 
  getTrip, 
  createTrip, 
  updateTrip, 
  deleteTrip,
  shareWithOrganization,
  unshareWithOrganization,
  shareWithUser,
  unshareWithUser,
} from '../middleware/tripsMiddleware'

const router = new Router({ prefix: '/trips' })

router.use(requireAuth)

router.get('/', getTrips)
router.get('/:id', getTrip)
router.post('/', createTrip)
router.put('/:id', updateTrip)
router.delete('/:id', deleteTrip)
router.post('/:id/share/organization', shareWithOrganization)
router.delete('/:id/share/organization', unshareWithOrganization)
router.post('/:id/share/user/:userId', shareWithUser)
router.delete('/:id/share/user/:userId', unshareWithUser)

export default router

import Router from '@koa/router'
import { getPayments, getPayment, createPayment, updatePayment, deletePayment } from '../middleware/paymentsMiddleware'

const router = new Router({ prefix: '/payments' })

router.get('/', getPayments)
router.get('/:id', getPayment)
router.post('/', createPayment)
router.put('/:id', updatePayment)
router.delete('/:id', deletePayment)

export default router

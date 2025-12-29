import { Context } from 'koa'
import PaymentModel from '../models/paymentModel'
import BookingModel from '../models/bookingModel'
import { paymentCreateSchema, paymentUpdateSchema } from '../schemas/payment'
import { validateBody, validateHasFields } from '../utils/validation'
import { parseId, parseQueryInt } from '../utils/params'
import { requireResource } from '../utils/resources'

export async function getPayments(ctx: Context) {
  const status = ctx.query.status as string | undefined
  const bookingId = parseQueryInt(ctx.query.booking_id)

  const payments = await PaymentModel.findAll({
    status,
    booking_id: bookingId,
  })
  ctx.body = payments
}

export async function getPayment(ctx: Context) {
  const id = parseId(ctx)
  const payment = await requireResource(ctx, () => PaymentModel.findById(id), 'Payment')

  ctx.body = payment
}

export async function createPayment(ctx: Context) {
  const data = validateBody(ctx, paymentCreateSchema)

  // Verify booking exists
  await requireResource(ctx, () => BookingModel.findById(data.booking_id), 'Booking', 400)

  const payment = await PaymentModel.create(data)
  ctx.status = 201
  ctx.body = payment
}

export async function updatePayment(ctx: Context) {
  const id = parseId(ctx)
  const data = validateBody(ctx, paymentUpdateSchema)
  validateHasFields(ctx, data)

  const payment = await requireResource(ctx, () => PaymentModel.update(id, data), 'Payment')

  ctx.body = payment
}

export async function deletePayment(ctx: Context) {
  const id = parseId(ctx)
  const deleted = await PaymentModel.remove(id)

  if (!deleted) ctx.throw(404, 'Payment not found')

  ctx.status = 204
}

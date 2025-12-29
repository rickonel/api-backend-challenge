import { Context } from 'koa'
import PaymentModel from '../models/paymentModel'
import BookingModel from '../models/bookingModel'
import { paymentCreateSchema, paymentUpdateSchema } from '../schemas/payment'

export async function getPayments(ctx: Context) {
  const status = ctx.query.status as string | undefined
  const bookingId = ctx.query.booking_id as string | undefined

  const payments = await PaymentModel.findAll({
    status,
    booking_id: bookingId ? parseInt(bookingId, 10) : undefined,
  })
  ctx.body = payments
}

export async function getPayment(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const payment = await PaymentModel.findById(id)

  if (!payment) ctx.throw(404, 'Payment not found')

  ctx.body = payment
}

export async function createPayment(ctx: Context) {
  const validation = paymentCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  // Verify booking exists
  const booking = await BookingModel.findById(validation.data.booking_id)
  if (!booking) ctx.throw(400, 'Booking not found')

  const payment = await PaymentModel.create(validation.data)
  ctx.status = 201
  ctx.body = payment
}

export async function updatePayment(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = paymentUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.throw(400, 'No fields to update')
  }

  const payment = await PaymentModel.update(id, validation.data)

  if (!payment) ctx.throw(404, 'Payment not found')

  ctx.body = payment
}

export async function deletePayment(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await PaymentModel.remove(id)

  if (!deleted) ctx.throw(404, 'Payment not found')

  ctx.status = 204
}

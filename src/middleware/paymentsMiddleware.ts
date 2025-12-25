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

  if (!payment) {
    ctx.status = 404
    ctx.body = { error: 'Payment not found' }
    return
  }

  ctx.body = payment
}

export async function createPayment(ctx: Context) {
  const validation = paymentCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  // Verify booking exists
  const booking = await BookingModel.findById(validation.data.booking_id)
  if (!booking) {
    ctx.status = 400
    ctx.body = { error: 'Booking not found' }
    return
  }

  const payment = await PaymentModel.create(validation.data)
  ctx.status = 201
  ctx.body = payment
}

export async function updatePayment(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = paymentUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.status = 400
    ctx.body = { error: 'No fields to update' }
    return
  }

  const payment = await PaymentModel.update(id, validation.data)

  if (!payment) {
    ctx.status = 404
    ctx.body = { error: 'Payment not found' }
    return
  }

  ctx.body = payment
}

export async function deletePayment(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await PaymentModel.remove(id)

  if (!deleted) {
    ctx.status = 404
    ctx.body = { error: 'Payment not found' }
    return
  }

  ctx.status = 204
}

import { Context } from 'koa'
import BookingModel from '../models/bookingModel'
import TripModel from '../models/tripModel'
import TravelerModel from '../models/travelerModel'
import PaymentModel from '../models/paymentModel'
import { PaymentStatus } from '../schemas/payment'
import { bookingCreateSchema, bookingUpdateSchema } from '../schemas/booking'
import { validateBody, validateHasFields } from '../utils/validation'
import { parseId, parseQueryInt } from '../utils/params'
import { requireResource } from '../utils/resources'

export async function getBookings(ctx: Context) {
  const status = ctx.query.status as string | undefined
  const tripId = parseQueryInt(ctx.query.trip_id)

  const bookings = await BookingModel.findAll({
    status,
    trip_id: tripId,
  })
  ctx.body = bookings
}

export async function getBooking(ctx: Context) {
  const id = parseId(ctx)
  const booking = await requireResource(ctx, () => BookingModel.findById(id), 'Booking')

  ctx.body = booking
}

export async function createBooking(ctx: Context) {
  const data = validateBody(ctx, bookingCreateSchema)
  const { trip_id, traveler_id } = data

  // Verify trip exists
  await requireResource(ctx, () => TripModel.findById(trip_id), 'Trip', 400)

  // Verify traveler exists
  await requireResource(ctx, () => TravelerModel.findById(traveler_id), 'Traveler', 400)

  const booking = await BookingModel.create(data)
  ctx.status = 201
  ctx.body = booking
}

export async function updateBooking(ctx: Context) {
  const id = parseId(ctx)
  const data = validateBody(ctx, bookingUpdateSchema)
  validateHasFields(ctx, data)

  // Verify trip exists if updating
  if (data.trip_id !== undefined) {
    await requireResource(ctx, () => TripModel.findById(data.trip_id!), 'Trip', 400)
  }

  // Verify traveler exists if updating
  if (data.traveler_id !== undefined) {
    await requireResource(ctx, () => TravelerModel.findById(data.traveler_id!), 'Traveler', 400)
  }

  const booking = await requireResource(ctx, () => BookingModel.update(id, data), 'Booking')

  ctx.body = booking
}

export async function deleteBooking(ctx: Context) {
  const id = parseId(ctx)
  const deleted = await BookingModel.remove(id)

  if (!deleted) ctx.throw(404, 'Booking not found')

  ctx.status = 204
}

export async function cancelBooking(ctx: Context) {
  const id = parseId(ctx)
  const booking = await requireResource(ctx, () => BookingModel.findById(id), 'Booking')

  if (booking.status === 'cancelled') ctx.throw(400, 'Booking is already cancelled')

  const updatedBooking = await BookingModel.update(id, { status: 'cancelled' })
  if (!updatedBooking) ctx.throw(500, 'Failed to cancel booking')

  const completedPayment = await PaymentModel.findLatestCompletedByBooking(id)
  let refund

  if (completedPayment) {
    const amount = Number(completedPayment.amount)
    const refundAmount = -Math.abs(amount)

    refund = await PaymentModel.create({
      booking_id: id,
      amount: refundAmount,
      currency: completedPayment.currency,
      status: PaymentStatus.Refunded,
    })
  }

  ctx.body = {
    booking: updatedBooking,
    ...(refund ? { refund } : {}),
  }
}

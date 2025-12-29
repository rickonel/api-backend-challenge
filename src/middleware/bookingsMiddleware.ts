import { Context } from 'koa'
import BookingModel from '../models/bookingModel'
import TripModel from '../models/tripModel'
import TravelerModel from '../models/travelerModel'
import { bookingCreateSchema, bookingUpdateSchema } from '../schemas/booking'

export async function getBookings(ctx: Context) {
  const status = ctx.query.status as string | undefined
  const tripId = ctx.query.trip_id as string | undefined

  const bookings = await BookingModel.findAll({
    status,
    trip_id: tripId ? parseInt(tripId, 10) : undefined,
  })
  ctx.body = bookings
}

export async function getBooking(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const booking = await BookingModel.findById(id)

  if (!booking) ctx.throw(404, 'Booking not found')

  ctx.body = booking
}

export async function createBooking(ctx: Context) {
  const validation = bookingCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const { trip_id, traveler_id } = validation.data

  // Verify trip exists
  const trip = await TripModel.findById(trip_id)
  if (!trip) ctx.throw(400, 'Trip not found')

  // Verify traveler exists
  const traveler = await TravelerModel.findById(traveler_id)
  if (!traveler) ctx.throw(400, 'Traveler not found')

  const booking = await BookingModel.create(validation.data)
  ctx.status = 201
  ctx.body = booking
}

export async function updateBooking(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = bookingUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.throw(400, 'No fields to update')
  }

  // Verify trip exists if updating
  if (validation.data.trip_id !== undefined) {
    const trip = await TripModel.findById(validation.data.trip_id)
    if (!trip) ctx.throw(400, 'Trip not found')
  }

  // Verify traveler exists if updating
  if (validation.data.traveler_id !== undefined) {
    const traveler = await TravelerModel.findById(validation.data.traveler_id)
    if (!traveler) ctx.throw(400, 'Traveler not found')
  }

  const booking = await BookingModel.update(id, validation.data)

  if (!booking) ctx.throw(404, 'Booking not found')

  ctx.body = booking
}

export async function deleteBooking(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await BookingModel.remove(id)

  if (!deleted) ctx.throw(404, 'Booking not found')

  ctx.status = 204
}

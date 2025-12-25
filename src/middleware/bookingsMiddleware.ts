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

  if (!booking) {
    ctx.status = 404
    ctx.body = { error: 'Booking not found' }
    return
  }

  ctx.body = booking
}

export async function createBooking(ctx: Context) {
  const validation = bookingCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  const { trip_id, traveler_id } = validation.data

  // Verify trip exists
  const trip = await TripModel.findById(trip_id)
  if (!trip) {
    ctx.status = 400
    ctx.body = { error: 'Trip not found' }
    return
  }

  // Verify traveler exists
  const traveler = await TravelerModel.findById(traveler_id)
  if (!traveler) {
    ctx.status = 400
    ctx.body = { error: 'Traveler not found' }
    return
  }

  const booking = await BookingModel.create(validation.data)
  ctx.status = 201
  ctx.body = booking
}

export async function updateBooking(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = bookingUpdateSchema.safeParse(ctx.request.body)

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

  // Verify trip exists if updating
  if (validation.data.trip_id !== undefined) {
    const trip = await TripModel.findById(validation.data.trip_id)
    if (!trip) {
      ctx.status = 400
      ctx.body = { error: 'Trip not found' }
      return
    }
  }

  // Verify traveler exists if updating
  if (validation.data.traveler_id !== undefined) {
    const traveler = await TravelerModel.findById(validation.data.traveler_id)
    if (!traveler) {
      ctx.status = 400
      ctx.body = { error: 'Traveler not found' }
      return
    }
  }

  const booking = await BookingModel.update(id, validation.data)

  if (!booking) {
    ctx.status = 404
    ctx.body = { error: 'Booking not found' }
    return
  }

  ctx.body = booking
}

export async function deleteBooking(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await BookingModel.remove(id)

  if (!deleted) {
    ctx.status = 404
    ctx.body = { error: 'Booking not found' }
    return
  }

  ctx.status = 204
}

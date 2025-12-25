import { Context } from 'koa'
import TripModel from '../models/tripModel'
import { tripCreateSchema, tripUpdateSchema } from '../schemas/trip'

export async function getTrips(ctx: Context) {
  const destination = ctx.query.destination as string | undefined
  const trips = await TripModel.findAll(destination)
  ctx.body = trips
}

export async function getTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const trip = await TripModel.findById(id)

  if (!trip) {
    ctx.status = 404
    ctx.body = { error: 'Trip not found' }
    return
  }

  ctx.body = trip
}

export async function createTrip(ctx: Context) {
  const validation = tripCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  const trip = await TripModel.create(validation.data)
  ctx.status = 201
  ctx.body = trip
}

export async function updateTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = tripUpdateSchema.safeParse(ctx.request.body)

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

  const trip = await TripModel.update(id, validation.data)

  if (!trip) {
    ctx.status = 404
    ctx.body = { error: 'Trip not found' }
    return
  }

  ctx.body = trip
}

export async function deleteTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await TripModel.remove(id)

  if (!deleted) {
    ctx.status = 404
    ctx.body = { error: 'Trip not found' }
    return
  }

  ctx.status = 204
}

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

  if (!trip) ctx.throw(404, 'Trip not found')

  ctx.body = trip
}

export async function createTrip(ctx: Context) {
  const validation = tripCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const trip = await TripModel.create(validation.data)
  ctx.status = 201
  ctx.body = trip
}

export async function updateTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = tripUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.throw(400, 'No fields to update')
  }

  const trip = await TripModel.update(id, validation.data)

  if (!trip) ctx.throw(404, 'Trip not found')

  ctx.body = trip
}

export async function deleteTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await TripModel.remove(id)

  if (!deleted) ctx.throw(404, 'Trip not found')

  ctx.status = 204
}

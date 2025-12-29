import { Context } from 'koa'
import TripModel from '../models/tripModel'
import { tripCreateSchema, tripUpdateSchema } from '../schemas/trip'
import { UserPublic } from '../schemas/user'
import { addOwner } from '../models/tripOwnerModel'
import { userCanAccessTrip, userCanEditTrip } from '../models/tripPermissionModel'

export async function getTrips(ctx: Context) {
  const user = ctx.state.user as UserPublic
  const destination = ctx.query.destination as string | undefined
  const trips = await TripModel.findAll(destination)
  const accessibleTrips = []

  for (const trip of trips) {
    const canAccess = await userCanAccessTrip(trip.id, user.id)
    if (canAccess) {
      accessibleTrips.push(trip)
    }
  }

  ctx.body = accessibleTrips
}

export async function getTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const trip = await TripModel.findById(id)

  if (!trip) ctx.throw(404, 'Trip not found')

  const user = ctx.state.user as UserPublic
  const canAccess = await userCanAccessTrip(id, user.id)
  if (!canAccess) ctx.throw(403, 'Access denied')

  ctx.body = trip
}

export async function createTrip(ctx: Context) {
  const validation = tripCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const user = ctx.state.user as UserPublic
  const trip = await TripModel.create(validation.data)
  await addOwner(trip.id, user.id)
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

  const user = ctx.state.user as UserPublic
  const canEdit = await userCanEditTrip(id, user.id)
  if (!canEdit) ctx.throw(403, 'Access denied')

  const trip = await TripModel.update(id, validation.data)

  if (!trip) ctx.throw(404, 'Trip not found')

  ctx.body = trip
}

export async function deleteTrip(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const user = ctx.state.user as UserPublic
  const canEdit = await userCanEditTrip(id, user.id)
  if (!canEdit) ctx.throw(403, 'Access denied')

  const deleted = await TripModel.remove(id)

  if (!deleted) ctx.throw(404, 'Trip not found')

  ctx.status = 204
}

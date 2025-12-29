import { Context } from 'koa'
import TripModel from '../models/tripModel'
import { tripCreateSchema, tripUpdateSchema } from '../schemas/trip'
import { UserPublic } from '../schemas/user'
import { userCanAccessTrip, userCanEditTrip, addOwner, isOwner } from '../models/tripPermissionModel'
import OrganizationTripShareModel from '../models/organizationTripShareModel'
import { shareWithOrganizationSchema } from '../schemas/organizationTripShare'
import { UserTripShareModel } from '../models/userTripShareModel'
import { shareWithUserSchema } from '../schemas/userTripShare'
import UserModel from '../models/userModel'

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
  
  const owner = await isOwner(id, user.id)
  if (!owner) ctx.throw(403, 'Only the trip owner can delete')

  const deleted = await TripModel.remove(id)

  if (!deleted) ctx.throw(404, 'Trip not found')

  ctx.status = 204
}

export async function shareWithOrganization(ctx: Context) {
  const tripId = parseInt(ctx.params.id, 10)
  const user = ctx.state.user as UserPublic

  const trip = await TripModel.findById(tripId)
  if (!trip) ctx.throw(404, 'Trip not found')

  const owner = await isOwner(tripId, user.id)
  if (!owner) ctx.throw(403, 'Only the trip owner can share')

  const validation = shareWithOrganizationSchema.safeParse(ctx.request.body)
  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const share = await OrganizationTripShareModel.create(
    tripId,
    user.organization_id,
    validation.data.permission_level
  )

  ctx.body = {
    message: 'Trip shared with organization successfully',
    share,
  }
}

export async function unshareWithOrganization(ctx: Context) {
  const tripId = parseInt(ctx.params.id, 10)
  const user = ctx.state.user as UserPublic

  const trip = await TripModel.findById(tripId)
  if (!trip) ctx.throw(404, 'Trip not found')

  const owner = await isOwner(tripId, user.id)
  if (!owner) ctx.throw(403, 'Only the trip owner can unshare')

  const deleted = await OrganizationTripShareModel.remove(tripId, user.organization_id)
  if (!deleted) ctx.throw(404, 'Trip is not shared with organization')

  ctx.body = {
    message: 'Trip unshared from organization successfully',
  }
}

export async function shareWithUser(ctx: Context) {
  const tripId = parseInt(ctx.params.id, 10)
  const targetUserId = parseInt(ctx.params.userId, 10)
  const user = ctx.state.user as UserPublic

  const trip = await TripModel.findById(tripId)
  if (!trip) ctx.throw(404, 'Trip not found')

  const owner = await isOwner(tripId, user.id)
  if (!owner) ctx.throw(403, 'Only the trip owner can share')

  if (targetUserId === user.id) {
    ctx.throw(400, 'Cannot share with yourself')
  }

  const targetUser = await UserModel.findByIdPublic(targetUserId)
  if (!targetUser) ctx.throw(404, 'User not found')

  const validation = shareWithUserSchema.safeParse(ctx.request.body)
  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const share = await UserTripShareModel.create(tripId, targetUserId, validation.data.permission_level)

  ctx.body = {
    message: 'Trip shared with user successfully',
    share,
  }
}

export async function unshareWithUser(ctx: Context) {
  const tripId = parseInt(ctx.params.id, 10)
  const targetUserId = parseInt(ctx.params.userId, 10)
  const user = ctx.state.user as UserPublic

  const trip = await TripModel.findById(tripId)
  if (!trip) ctx.throw(404, 'Trip not found')

  const owner = await isOwner(tripId, user.id)
  if (!owner) ctx.throw(403, 'Only the trip owner can unshare')

  const deleted = await UserTripShareModel.remove(tripId, targetUserId)
  if (!deleted) ctx.throw(404, 'Trip is not shared with this user')

  ctx.body = {
    message: 'Trip unshared from user successfully',
  }
}


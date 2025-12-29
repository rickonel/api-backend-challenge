import { Context } from 'koa'
import TripModel from '../models/tripModel'
import { tripCreateSchema, tripUpdateSchema } from '../schemas/trip'
import { UserPublic } from '../schemas/user'
import { userCanAccessTrip, addOwner } from '../models/tripPermissionModel'
import OrganizationTripShareModel from '../models/organizationTripShareModel'
import { shareWithOrganizationSchema } from '../schemas/organizationTripShare'
import { UserTripShareModel } from '../models/userTripShareModel'
import { shareWithUserSchema } from '../schemas/userTripShare'
import UserModel from '../models/userModel'
import { validateBody, validateHasFields } from '../utils/validation'
import { parseId } from '../utils/params'
import { requireResource } from '../utils/resources'
import { requireUser, requireTripOwnership, requireTripAccess, requireTripEdit } from '../utils/auth'

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
  const id = parseId(ctx)
  const trip = await requireResource(ctx, () => TripModel.findById(id), 'Trip')

  await requireTripAccess(ctx, id)

  ctx.body = trip
}

export async function createTrip(ctx: Context) {
  const data = validateBody(ctx, tripCreateSchema)
  const user = requireUser(ctx)
  const trip = await TripModel.create(data)
  await addOwner(trip.id, user.id)
  ctx.status = 201
  ctx.body = trip
}

export async function updateTrip(ctx: Context) {
  const id = parseId(ctx)
  const data = validateBody(ctx, tripUpdateSchema)
  validateHasFields(ctx, data)

  await requireTripEdit(ctx, id)

  const trip = await requireResource(ctx, () => TripModel.update(id, data), 'Trip')

  ctx.body = trip
}

export async function deleteTrip(ctx: Context) {
  const id = parseId(ctx)
  await requireTripOwnership(ctx, id)

  const deleted = await TripModel.remove(id)

  if (!deleted) ctx.throw(404, 'Trip not found')

  ctx.status = 204
}

export async function shareWithOrganization(ctx: Context) {
  const tripId = parseId(ctx)
  const user = requireUser(ctx)

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  const data = validateBody(ctx, shareWithOrganizationSchema)

  const share = await OrganizationTripShareModel.create(
    tripId,
    user.organization_id,
    data.permission_level
  )

  ctx.body = {
    message: 'Trip shared with organization successfully',
    share,
  }
}

export async function unshareWithOrganization(ctx: Context) {
  const tripId = parseId(ctx)
  const user = requireUser(ctx)

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  const deleted = await OrganizationTripShareModel.remove(tripId, user.organization_id)
  if (!deleted) ctx.throw(404, 'Trip is not shared with organization')

  ctx.body = {
    message: 'Trip unshared from organization successfully',
  }
}

export async function shareWithUser(ctx: Context) {
  const tripId = parseId(ctx)
  const targetUserId = parseId(ctx, 'userId')
  const user = requireUser(ctx)

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  if (targetUserId === user.id) {
    ctx.throw(400, 'Cannot share with yourself')
  }

  await requireResource(ctx, () => UserModel.findByIdPublic(targetUserId), 'User')

  const data = validateBody(ctx, shareWithUserSchema)

  const share = await UserTripShareModel.create(tripId, targetUserId, data.permission_level)

  ctx.body = {
    message: 'Trip shared with user successfully',
    share,
  }
}

export async function unshareWithUser(ctx: Context) {
  const tripId = parseId(ctx)
  const targetUserId = parseId(ctx, 'userId')

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  const deleted = await UserTripShareModel.remove(tripId, targetUserId)
  if (!deleted) ctx.throw(404, 'Trip is not shared with this user')

  ctx.body = {
    message: 'Trip unshared from user successfully',
  }
}


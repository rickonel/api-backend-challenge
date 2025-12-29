import { Context } from 'koa'
import { UserPublic } from '../schemas/user'
import { isOwner, userCanAccessTrip, userCanEditTrip } from '../models/tripPermissionModel'


export function requireUser(ctx: Context): UserPublic {
  const user = ctx.state.user as UserPublic | undefined
  if (!user) {
    ctx.throw(401, 'Authentication required')
  }
  return user
}

export function getUser(ctx: Context): UserPublic | undefined {
  return ctx.state.user as UserPublic | undefined
}

export async function requireTripOwnership(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const owner = await isOwner(tripId, user.id)
  if (!owner) {
    ctx.throw(403, 'Only the trip owner can perform this action')
  }
}

export async function requireTripAccess(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const canAccess = await userCanAccessTrip(tripId, user.id)
  if (!canAccess) {
    ctx.throw(403, 'Access denied')
  }
}

export async function requireTripEdit(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const canEdit = await userCanEditTrip(tripId, user.id)
  if (!canEdit) {
    ctx.throw(403, 'Access denied')
  }
}

import { Context } from 'koa'
import { UserPublic } from '../schemas/user'
import { isOwner, userCanAccessTrip, userCanEditTrip } from '../models/tripPermissionModel'

/**
 * Require that a user is authenticated, throwing 401 if not.
 * @param ctx - Koa context
 * @returns The authenticated user
 */
export function requireUser(ctx: Context): UserPublic {
  const user = ctx.state.user as UserPublic | undefined
  if (!user) {
    ctx.throw(401, 'Authentication required')
  }
  return user
}

/**
 * Get the currently authenticated user, if any.
 * @param ctx - Koa context
 * @returns The authenticated user or undefined
 */
export function getUser(ctx: Context): UserPublic | undefined {
  return ctx.state.user as UserPublic | undefined
}

/**
 * Require that the current user owns the specified trip.
 * Throws 403 if the user is not the owner.
 * 
 * @param ctx - Koa context
 * @param tripId - The trip ID to check ownership for
 */
export async function requireTripOwnership(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const owner = await isOwner(tripId, user.id)
  if (!owner) {
    ctx.throw(403, 'Only the trip owner can perform this action')
  }
}

/**
 * Require that the current user has read access to the specified trip.
 * Throws 403 if the user cannot access the trip.
 * 
 * @param ctx - Koa context
 * @param tripId - The trip ID to check access for
 */
export async function requireTripAccess(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const canAccess = await userCanAccessTrip(tripId, user.id)
  if (!canAccess) {
    ctx.throw(403, 'Access denied')
  }
}

/**
 * Require that the current user has edit access to the specified trip.
 * Throws 403 if the user cannot edit the trip.
 * 
 * @param ctx - Koa context
 * @param tripId - The trip ID to check edit permissions for
 */
export async function requireTripEdit(ctx: Context, tripId: number): Promise<void> {
  const user = requireUser(ctx)
  const canEdit = await userCanEditTrip(tripId, user.id)
  if (!canEdit) {
    ctx.throw(403, 'Access denied')
  }
}

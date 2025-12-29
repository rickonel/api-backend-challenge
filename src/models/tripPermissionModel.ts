import { executeQuery } from '../db'
import { getOrganizationPermission } from './organizationTripShareModel'
import { UserTripShareModel } from './userTripShareModel'

export async function addOwner(tripId: number, userId: number): Promise<void> {
  await executeQuery(
    `INSERT INTO trip_permissions (trip_id, user_id, permission_level) 
     VALUES ($1, $2, 'owner')
     ON CONFLICT (trip_id, user_id) DO NOTHING`,
    [tripId, userId]
  )
}

export async function isOwner(tripId: number, userId: number): Promise<boolean> {
  const result = await executeQuery<{ permission_level: string }>(
    `SELECT permission_level
     FROM trip_permissions
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  return result.rows[0]?.permission_level === 'owner'
}

export async function userCanAccessTrip(tripId: number, userId: number): Promise<boolean> {
  
  const individualPermResult = await executeQuery<{ exists: boolean }>(
    `SELECT true AS exists
     FROM trip_permissions
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  if (individualPermResult.rows[0]?.exists) return true

  const userPermission = await UserTripShareModel.getUserPermission(tripId, userId)
  if (userPermission) return true

  const userOrgResult = await executeQuery<{ organization_id: number }>(
    `SELECT organization_id FROM users WHERE id = $1`,
    [userId]
  )
  const organizationId = userOrgResult.rows[0]?.organization_id
  if (!organizationId) return false

  const orgPermission = await getOrganizationPermission(tripId, organizationId)
  return orgPermission !== null
}

export async function userCanEditTrip(tripId: number, userId: number): Promise<boolean> {
  // Check individual permissions
  const individualPermResult = await executeQuery<{ permission_level: string }>(
    `SELECT permission_level
     FROM trip_permissions
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  const individualPerm = individualPermResult.rows[0]?.permission_level
  if (individualPerm === 'owner' || individualPerm === 'write') return true

  const userPermission = await UserTripShareModel.getUserPermission(tripId, userId)
  if (userPermission === 'write') return true

  const userOrgResult = await executeQuery<{ organization_id: number }>(
    `SELECT organization_id FROM users WHERE id = $1`,
    [userId]
  )
  const organizationId = userOrgResult.rows[0]?.organization_id
  if (!organizationId) return false

  const orgPermission = await getOrganizationPermission(tripId, organizationId)
  return orgPermission === 'write'
}

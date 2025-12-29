import { executeQuery } from '../db'

export interface OrganizationTripShare {
  trip_id: number
  organization_id: number
  permission_level: string
  created_at: string
}

export async function create(
  tripId: number,
  organizationId: number,
  permissionLevel: string
): Promise<OrganizationTripShare> {
  const result = await executeQuery<OrganizationTripShare>(
    `INSERT INTO organization_trip_shares (trip_id, organization_id, permission_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (trip_id, organization_id) 
     DO UPDATE SET permission_level = EXCLUDED.permission_level
     RETURNING *`,
    [tripId, organizationId, permissionLevel]
  )
  return result.rows[0]
}

export async function findByTripAndOrganization(
  tripId: number,
  organizationId: number
): Promise<OrganizationTripShare | null> {
  const result = await executeQuery<OrganizationTripShare>(
    `SELECT * FROM organization_trip_shares
     WHERE trip_id = $1 AND organization_id = $2`,
    [tripId, organizationId]
  )
  return result.rows[0] || null
}

export async function remove(tripId: number, organizationId: number): Promise<boolean> {
  const result = await executeQuery(
    `DELETE FROM organization_trip_shares
     WHERE trip_id = $1 AND organization_id = $2`,
    [tripId, organizationId]
  )
  return result.rowCount !== null && result.rowCount > 0
}

export async function getOrganizationPermission(
  tripId: number,
  organizationId: number
): Promise<string | null> {
  const result = await executeQuery<{ permission_level: string }>(
    `SELECT permission_level FROM organization_trip_shares
     WHERE trip_id = $1 AND organization_id = $2`,
    [tripId, organizationId]
  )
  return result.rows[0]?.permission_level || null
}

const OrganizationTripShareModel = {
  create,
  findByTripAndOrganization,
  remove,
  getOrganizationPermission,
}

export default OrganizationTripShareModel

import { executeQuery } from '../db'

export async function addOwner(tripId: number, userId: number): Promise<void> {
  await executeQuery(
    `INSERT INTO trip_permissions (trip_id, user_id, permission_level) 
     VALUES ($1, $2, 'owner')
     ON CONFLICT (trip_id, user_id) DO NOTHING`,
    [tripId, userId]
  )
}

export async function userCanAccessTrip(tripId: number, userId: number): Promise<boolean> {
  const result = await executeQuery<{ exists: boolean }>(
    `SELECT true AS exists
     FROM trip_permissions
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  return Boolean(result.rows[0]?.exists)
}

export async function userCanEditTrip(tripId: number, userId: number): Promise<boolean> {
  const result = await executeQuery<{ permission_level: string }>(
    `SELECT permission_level
     FROM trip_permissions
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  const permission = result.rows[0]?.permission_level
  return permission === 'owner' || permission === 'write'
}

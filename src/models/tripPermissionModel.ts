import { executeQuery } from '../db'

export async function userCanAccessTrip(tripId: number, userId: number): Promise<boolean> {
  const result = await executeQuery<{ exists: boolean }>(
    `SELECT true AS exists
     FROM trip_owners
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  return Boolean(result.rows[0]?.exists)
}

export async function userCanEditTrip(tripId: number, userId: number): Promise<boolean> {
  return userCanAccessTrip(tripId, userId)
}

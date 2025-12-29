import { executeQuery } from '../db'

export async function addOwner(tripId: number, userId: number): Promise<void> {
  await executeQuery(
    `INSERT INTO trip_owners (trip_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [tripId, userId]
  )
}

export async function isOwner(tripId: number, userId: number): Promise<boolean> {
  const result = await executeQuery<{ exists: boolean }>(
    `SELECT true as exists FROM trip_owners WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  return Boolean(result.rows[0]?.exists)
}

import { pool } from '../db'

export interface UserTripShare {
  trip_id: number
  user_id: number
  permission_level: 'read' | 'write'
  created_at: Date
}

async function create(tripId: number, userId: number, permissionLevel: 'read' | 'write'): Promise<UserTripShare> {
  const result = await pool.query<UserTripShare>(
    `INSERT INTO user_trip_shares (trip_id, user_id, permission_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (trip_id, user_id) DO UPDATE SET permission_level = $3
     RETURNING *`,
    [tripId, userId, permissionLevel]
  )
  return result.rows[0]
}

async function findByTripAndUser(tripId: number, userId: number): Promise<UserTripShare | null> {
  const result = await pool.query<UserTripShare>(
    'SELECT * FROM user_trip_shares WHERE trip_id = $1 AND user_id = $2',
    [tripId, userId]
  )
  return result.rows[0] || null
}

async function remove(tripId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM user_trip_shares WHERE trip_id = $1 AND user_id = $2',
    [tripId, userId]
  )
  return (result.rowCount ?? 0) > 0
}

async function getUserPermission(tripId: number, userId: number): Promise<string | null> {
  const result = await pool.query<{ permission_level: string }>(
    'SELECT permission_level FROM user_trip_shares WHERE trip_id = $1 AND user_id = $2',
    [tripId, userId]
  )
  return result.rows[0]?.permission_level || null
}

export const UserTripShareModel = {
  create,
  findByTripAndUser,
  remove,
  getUserPermission,
}

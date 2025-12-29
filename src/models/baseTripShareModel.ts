import { pool } from '../db'

export interface BaseTripShare {
  trip_id: number
  permission_level: 'read' | 'write'
  created_at: Date
}

export abstract class TripShareModel<T extends BaseTripShare, ShareId> {
  protected abstract tableName: string
  protected abstract shareIdColumn: string

  async create(tripId: number, shareId: ShareId, permissionLevel: 'read' | 'write'): Promise<T> {
    const result = await pool.query<T>(
      `INSERT INTO ${this.tableName} (trip_id, ${this.shareIdColumn}, permission_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, ${this.shareIdColumn}) DO UPDATE SET permission_level = $3
       RETURNING *`,
      [tripId, shareId, permissionLevel]
    )
    return result.rows[0]
  }

  async findByTripAndShareId(tripId: number, shareId: ShareId): Promise<T | null> {
    const result = await pool.query<T>(
      `SELECT * FROM ${this.tableName} WHERE trip_id = $1 AND ${this.shareIdColumn} = $2`,
      [tripId, shareId]
    )
    return result.rows[0] || null
  }

  async remove(tripId: number, shareId: ShareId): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM ${this.tableName} WHERE trip_id = $1 AND ${this.shareIdColumn} = $2`,
      [tripId, shareId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async getPermission(tripId: number, shareId: ShareId): Promise<string | null> {
    const result = await pool.query<{ permission_level: string }>(
      `SELECT permission_level FROM ${this.tableName} WHERE trip_id = $1 AND ${this.shareIdColumn} = $2`,
      [tripId, shareId]
    )
    return result.rows[0]?.permission_level || null
  }
}

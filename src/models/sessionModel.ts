import { executeQuery } from '../db'

export interface Session {
  id: string
  user_id: number
  expires_at: string
}

export async function create(session: Session): Promise<Session> {
  const result = await executeQuery<Session>(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [session.id, session.user_id, session.expires_at]
  )
  return result.rows[0]
}

export async function findById(id: string): Promise<Session | undefined> {
  const result = await executeQuery<Session>(
    `SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()`,
    [id]
  )
  return result.rows[0]
}

export async function remove(id: string): Promise<void> {
  await executeQuery(`DELETE FROM sessions WHERE id = $1`, [id])
}

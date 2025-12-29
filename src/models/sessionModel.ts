import { executeQuery } from '../db'
import { Session, SessionCreate } from '../schemas/session'


async function findById(id: string): Promise<Session | undefined> {
  const query = 'SELECT * FROM sessions WHERE id = $1'
  const result = await executeQuery<Session>(query, [id])
  return result.rows[0]
}

async function findByIdAndNotExpired(id: string): Promise<Session | undefined> {
  const query = 'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()'
  const result = await executeQuery<Session>(query, [id])
  return result.rows[0]
}

async function create(data: SessionCreate): Promise<Session> {
  const query = `
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const result = await executeQuery<Session>(query, [
    data.id,
    data.user_id,
    data.expires_at,
  ])
  return result.rows[0]
}

async function remove(id: string): Promise<boolean> {
  const query = 'DELETE FROM sessions WHERE id = $1'
  const result = await executeQuery(query, [id])
  return (result.rowCount ?? 0) > 0
}

async function removeExpired(): Promise<number> {
  const query = 'DELETE FROM sessions WHERE expires_at < NOW()'
  const result = await executeQuery(query)
  return result.rowCount ?? 0
}

export default {
  findById,
  findByIdAndNotExpired,
  create,
  remove,
  removeExpired,
}

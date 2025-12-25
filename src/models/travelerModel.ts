import { executeQuery } from '../db'
import { Traveler, TravelerCreate, TravelerUpdate } from '../schemas/traveler'

async function findAll(email?: string): Promise<Traveler[]> {
  let query = 'SELECT * FROM travelers'
  const params: string[] = []

  if (email) {
    query += ' WHERE email ILIKE $1'
    params.push(`%${email}%`)
  }

  query += ' ORDER BY created_at DESC'

  const result = await executeQuery<Traveler>(query, params)
  return result.rows
}

async function findById(id: number): Promise<Traveler | undefined> {
  const query = 'SELECT * FROM travelers WHERE id = $1'
  const result = await executeQuery<Traveler>(query, [id])
  return result.rows[0]
}

async function create(data: TravelerCreate): Promise<Traveler> {
  const query = `
    INSERT INTO travelers (first_name, last_name, email)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const result = await executeQuery<Traveler>(query, [
    data.first_name,
    data.last_name,
    data.email,
  ])
  return result.rows[0]
}

async function update(id: number, data: TravelerUpdate): Promise<Traveler | undefined> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.first_name !== undefined) {
    updates.push(`first_name = $${paramIndex++}`)
    values.push(data.first_name)
  }
  if (data.last_name !== undefined) {
    updates.push(`last_name = $${paramIndex++}`)
    values.push(data.last_name)
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`)
    values.push(data.email)
  }

  if (updates.length === 0) {
    return undefined
  }

  values.push(id)
  const query = `UPDATE travelers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const result = await executeQuery<Traveler>(query, values)
  return result.rows[0]
}

async function remove(id: number): Promise<boolean> {
  const query = 'DELETE FROM travelers WHERE id = $1'
  const result = await executeQuery(query, [id])
  return (result.rowCount ?? 0) > 0
}

export default {
  findAll,
  findById,
  create,
  update,
  remove,
}

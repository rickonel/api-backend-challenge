import { executeQuery } from '../db'
import { Trip, TripCreate, TripUpdate } from '../schemas/trip'

async function findAll(destination?: string): Promise<Trip[]> {
  let query = 'SELECT * FROM trips'
  const params: string[] = []

  if (destination) {
    query += ' WHERE destination ILIKE $1'
    params.push(`%${destination}%`)
  }

  query += ' ORDER BY created_at DESC'

  const result = await executeQuery<Trip>(query, params)
  return result.rows
}

async function findById(id: number): Promise<Trip | undefined> {
  const query = 'SELECT * FROM trips WHERE id = $1'
  const result = await executeQuery<Trip>(query, [id])
  return result.rows[0]
}

async function create(data: TripCreate): Promise<Trip> {
  const query = `
    INSERT INTO trips (title, destination, start_date, end_date)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `
  const result = await executeQuery<Trip>(query, [
    data.title,
    data.destination,
    data.start_date,
    data.end_date,
  ])
  return result.rows[0]
}

async function update(id: number, data: TripUpdate): Promise<Trip | undefined> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    values.push(data.title)
  }
  if (data.destination !== undefined) {
    updates.push(`destination = $${paramIndex++}`)
    values.push(data.destination)
  }
  if (data.start_date !== undefined) {
    updates.push(`start_date = $${paramIndex++}`)
    values.push(data.start_date)
  }
  if (data.end_date !== undefined) {
    updates.push(`end_date = $${paramIndex++}`)
    values.push(data.end_date)
  }

  if (updates.length === 0) {
    return undefined
  }

  values.push(id)
  const query = `UPDATE trips SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const result = await executeQuery<Trip>(query, values)
  return result.rows[0]
}

async function remove(id: number): Promise<boolean> {
  const query = 'DELETE FROM trips WHERE id = $1'
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

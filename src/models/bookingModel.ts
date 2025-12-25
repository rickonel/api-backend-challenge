import { executeQuery } from '../db'
import { Booking, BookingCreate, BookingUpdate } from '../schemas/booking'

interface BookingFilters {
  status?: string
  trip_id?: number
}

async function findAll(filters: BookingFilters = {}): Promise<Booking[]> {
  let query = 'SELECT * FROM bookings'
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`)
    params.push(filters.status)
  }

  if (filters.trip_id) {
    conditions.push(`trip_id = $${paramIndex++}`)
    params.push(filters.trip_id)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' ORDER BY created_at DESC'

  const result = await executeQuery<Booking>(query, params)
  return result.rows
}

async function findById(id: number): Promise<Booking | undefined> {
  const query = 'SELECT * FROM bookings WHERE id = $1'
  const result = await executeQuery<Booking>(query, [id])
  return result.rows[0]
}

async function create(data: BookingCreate): Promise<Booking> {
  const query = `
    INSERT INTO bookings (trip_id, traveler_id)
    VALUES ($1, $2)
    RETURNING *
  `
  const result = await executeQuery<Booking>(query, [data.trip_id, data.traveler_id])
  return result.rows[0]
}

async function update(id: number, data: BookingUpdate): Promise<Booking | undefined> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.trip_id !== undefined) {
    updates.push(`trip_id = $${paramIndex++}`)
    values.push(data.trip_id)
  }
  if (data.traveler_id !== undefined) {
    updates.push(`traveler_id = $${paramIndex++}`)
    values.push(data.traveler_id)
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(data.status)
  }

  if (updates.length === 0) {
    return undefined
  }

  values.push(id)
  const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const result = await executeQuery<Booking>(query, values)
  return result.rows[0]
}

async function remove(id: number): Promise<boolean> {
  const query = 'DELETE FROM bookings WHERE id = $1'
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

import { executeQuery } from '../db'
import { Payment, PaymentCreate, PaymentUpdate } from '../schemas/payment'

interface PaymentFilters {
  status?: string
  booking_id?: number
}

async function findAll(filters: PaymentFilters = {}): Promise<Payment[]> {
  let query = 'SELECT * FROM payments'
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`)
    params.push(filters.status)
  }

  if (filters.booking_id) {
    conditions.push(`booking_id = $${paramIndex++}`)
    params.push(filters.booking_id)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' ORDER BY created_at DESC'

  const result = await executeQuery<Payment>(query, params)
  return result.rows
}

async function findById(id: number): Promise<Payment | undefined> {
  const query = 'SELECT * FROM payments WHERE id = $1'
  const result = await executeQuery<Payment>(query, [id])
  return result.rows[0]
}

async function create(data: PaymentCreate): Promise<Payment> {
  const query = `
    INSERT INTO payments (booking_id, amount, currency)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const result = await executeQuery<Payment>(query, [
    data.booking_id,
    data.amount,
    data.currency || 'EUR',
  ])
  return result.rows[0]
}

async function update(id: number, data: PaymentUpdate): Promise<Payment | undefined> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.amount !== undefined) {
    updates.push(`amount = $${paramIndex++}`)
    values.push(data.amount)
  }
  if (data.currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`)
    values.push(data.currency)
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(data.status)
  }

  if (updates.length === 0) {
    return undefined
  }

  values.push(id)
  const query = `UPDATE payments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const result = await executeQuery<Payment>(query, values)
  return result.rows[0]
}

async function remove(id: number): Promise<boolean> {
  const query = 'DELETE FROM payments WHERE id = $1'
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

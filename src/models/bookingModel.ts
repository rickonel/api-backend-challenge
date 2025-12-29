import { executeQuery } from '../db'
import { Booking, BookingCreate, BookingUpdate } from '../schemas/booking'
import { Payment } from '../schemas/payment'
import { PaymentStatus } from '../schemas/payment'
import { withTransaction } from '../utils/transaction'
import { PoolClient } from 'pg'

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

interface CancelBookingResult {
  booking: Booking
  refund?: Payment
}

async function cancelWithRefund(id: number): Promise<CancelBookingResult> {
  // ACID: Use transaction to ensure atomicity: both operations succeed or both fail
  return withTransaction(async (client: PoolClient) => {
    const updateResult = await client.query<Booking>(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      ['cancelled', id]
    )
    const updatedBooking = updateResult.rows[0]
    
    if (!updatedBooking) {
      throw new Error('Failed to cancel booking')
    }

    const paymentResult = await client.query<Payment>(
      `SELECT *
       FROM payments
       WHERE booking_id = $1 AND status = 'completed'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [id]
    )
    const completedPayment = paymentResult.rows[0]

    let refund: Payment | undefined

    if (completedPayment) {
      const amount = Number(completedPayment.amount)
      const refundAmount = -Math.abs(amount)

      const refundResult = await client.query<Payment>(
        `INSERT INTO payments (booking_id, amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, refundAmount, completedPayment.currency, PaymentStatus.Refunded]
      )
      refund = refundResult.rows[0]
    }

    return { booking: updatedBooking, refund }
  })
}

export default {
  findAll,
  findById,
  create,
  update,
  remove,
  cancelWithRefund,
}

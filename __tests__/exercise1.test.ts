import request from 'supertest'
import app from '../src/app'
import { pool } from '../src/db'

interface Trip {
  id: number
}

interface Traveler {
  id: number
}

interface Booking {
  id: number
}

interface Payment {
  id: number
  amount: number
  currency: string
}

async function resetDatabase() {
  await pool.query('TRUNCATE payments, bookings, travelers, trips RESTART IDENTITY CASCADE')
}

async function createTrip(overrides: Partial<Record<string, unknown>> = {}): Promise<Trip> {
  const result = await pool.query<Trip>(
    `INSERT INTO trips (title, destination, start_date, end_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      (overrides.title as string) ?? 'City Break',
      (overrides.destination as string) ?? 'Paris',
      (overrides.start_date as string) ?? '2025-01-01',
      (overrides.end_date as string) ?? '2025-01-07',
    ]
  )

  return result.rows[0]
}

async function createTraveler(overrides: Partial<Record<string, unknown>> = {}): Promise<Traveler> {
  const result = await pool.query<Traveler>(
    `INSERT INTO travelers (first_name, last_name, email)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [
      (overrides.first_name as string) ?? 'Ada',
      (overrides.last_name as string) ?? 'Lovelace',
      (overrides.email as string) ?? `ada${Date.now()}@example.com`,
    ]
  )

  return result.rows[0]
}

async function createBooking(data: { trip_id: number; traveler_id: number; status?: string }): Promise<Booking> {
  const result = await pool.query<Booking>(
    `INSERT INTO bookings (trip_id, traveler_id, status)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [data.trip_id, data.traveler_id, data.status ?? 'confirmed']
  )

  return result.rows[0]
}

async function createPayment(data: {
  booking_id: number
  amount?: number
  currency?: string
  status?: string
}): Promise<Payment> {
  const result = await pool.query<Payment & { amount: string }>(
    `INSERT INTO payments (booking_id, amount, currency, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, amount, currency`,
    [
      data.booking_id,
      data.amount ?? 500,
      data.currency ?? 'EUR',
      data.status ?? 'completed',
    ]
  )

  const row = result.rows[0]
  return {
    id: row.id,
    amount: Number(row.amount),
    currency: row.currency,
  }
}

async function listPayments(bookingId: number) {
  const result = await pool.query<{ status: string; amount: string; currency: string }>(
    `SELECT status, amount, currency
     FROM payments
     WHERE booking_id = $1
     ORDER BY id ASC`,
    [bookingId]
  )

  return result.rows.map((row) => ({
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
  }))
}

beforeEach(async () => {
  await resetDatabase()
})

describe('Exercise 1: Booking Cancellation', () => {
  it('cancels booking with completed payment and creates refund', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    const payment = await createPayment({ booking_id: booking.id })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body.booking).toBeDefined()
    expect(response.body.booking.status).toBe('cancelled')
    expect(response.body.booking.id).toBe(booking.id)

    expect(response.body.refund).toBeDefined()
    expect(response.body.refund.booking_id).toBe(booking.id)
    expect(Number(response.body.refund.amount)).toBe(-payment.amount)
    expect(response.body.refund.currency).toBe(payment.currency)
    expect(response.body.refund.status).toBe('refunded')
  })

  it('returns 400 when booking is already cancelled', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id, status: 'cancelled' })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Booking is already cancelled')
  })

  it('returns 404 when booking does not exist', async () => {
    const response = await request(app.callback()).patch('/bookings/999/cancel')

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Booking not found')
  })

  it('cancels booking without payments and does not include refund', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body.booking.status).toBe('cancelled')
    expect(response.body).not.toHaveProperty('refund')
  })

  it('does not create refund when latest payment is pending', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    await createPayment({ booking_id: booking.id, status: 'pending' })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body.booking.status).toBe('cancelled')
    expect(response.body).not.toHaveProperty('refund')
  })

  it('uses latest completed payment when multiple exist', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    await createPayment({ booking_id: booking.id, amount: 200 })
    await createPayment({ booking_id: booking.id, amount: 750 })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(Number(response.body.refund.amount)).toBe(-750)
  })

  it('keeps original payment status as completed after refund', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    await createPayment({ booking_id: booking.id })

    await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    const payments = await listPayments(booking.id)
    expect(payments.map((p) => p.status)).toEqual(['completed', 'refunded'])
  })

  it('cancels pending bookings and creates refund if payment completed', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id, status: 'pending' })
    await createPayment({ booking_id: booking.id, amount: 150 })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body.booking.status).toBe('cancelled')
    expect(Number(response.body.refund.amount)).toBe(-150)
  })

  it('sets refund currency to match original payment currency', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    await createPayment({ booking_id: booking.id, currency: 'USD' })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body.refund.currency).toBe('USD')
  })

  it('ignores previously refunded payments when cancelling again', async () => {
    const trip = await createTrip()
    const traveler = await createTraveler()
    const booking = await createBooking({ trip_id: trip.id, traveler_id: traveler.id })
    await createPayment({ booking_id: booking.id, amount: -500, status: 'refunded' })

    const response = await request(app.callback()).patch(`/bookings/${booking.id}/cancel`)

    expect(response.status).toBe(200)
    expect(response.body).not.toHaveProperty('refund')

    const payments = await listPayments(booking.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].status).toBe('refunded')
  })
})

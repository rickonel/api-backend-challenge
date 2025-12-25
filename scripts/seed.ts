import { pool } from '../src/db'

async function seed() {
  const client = await pool.connect()

  try {
    console.log('Seeding database...')

    // Clear existing data
    await client.query('DELETE FROM payments')
    await client.query('DELETE FROM bookings')
    await client.query('DELETE FROM travelers')
    await client.query('DELETE FROM trips')

    // Reset sequences
    await client.query('ALTER SEQUENCE trips_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE travelers_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE payments_id_seq RESTART WITH 1')

    // Insert trips
    await client.query(`
      INSERT INTO trips (title, destination, start_date, end_date) VALUES
      ('Barcelona Adventure', 'Barcelona', '2025-03-15', '2025-03-20'),
      ('Paris Getaway', 'Paris', '2025-04-01', '2025-04-05'),
      ('Tokyo Explorer', 'Tokyo', '2025-05-10', '2025-05-20')
    `)

    // Insert travelers
    await client.query(`
      INSERT INTO travelers (first_name, last_name, email) VALUES
      ('John', 'Doe', 'john@example.com'),
      ('Jane', 'Smith', 'jane@example.com'),
      ('Bob', 'Wilson', 'bob@example.com')
    `)

    // Insert bookings
    await client.query(`
      INSERT INTO bookings (trip_id, traveler_id, status) VALUES
      (1, 1, 'confirmed'),
      (2, 2, 'pending'),
      (3, 3, 'confirmed')
    `)

    // Insert payments
    await client.query(`
      INSERT INTO payments (booking_id, amount, currency, status) VALUES
      (1, 500.00, 'EUR', 'completed'),
      (2, 750.00, 'EUR', 'pending'),
      (3, 1200.00, 'EUR', 'completed')
    `)

    console.log('Seed data inserted successfully')
  } catch (error) {
    console.error('Seed failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

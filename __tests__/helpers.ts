import { pool } from '../src/db'
import { hashPassword } from '../src/utils/crypto'

export async function setupDatabase() {
  const client = await pool.connect()
  
  try {
    // Clear existing data
    await client.query('DELETE FROM payments')
    await client.query('DELETE FROM bookings')
    await client.query('DELETE FROM travelers')
    await client.query('DELETE FROM organization_trip_shares')
    await client.query('DELETE FROM trip_permissions')
    await client.query('DELETE FROM sessions')
    await client.query('DELETE FROM trips')
    await client.query('DELETE FROM users')
    await client.query('DELETE FROM organizations')

    // Reset sequences
    await client.query('ALTER SEQUENCE trips_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE travelers_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE payments_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE organizations_id_seq RESTART WITH 1')
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1')

    // Insert organizations
    await client.query(`
      INSERT INTO organizations (name) VALUES
      ('Wanderlust Travel'),
      ('Global Adventures')
    `)

    // Insert users with properly hashed passwords
    const password_hash = await hashPassword('password123')
    
    await client.query(`
      INSERT INTO users (organization_id, email, password_hash, first_name, last_name) VALUES
      (1, 'alice@wanderlust.com', $1, 'Alice', 'Johnson'),
      (1, 'bob@wanderlust.com', $1, 'Bob', 'Smith'),
      (2, 'charlie@globaladv.com', $1, 'Charlie', 'Brown')
    `, [password_hash])

    // Insert trips
    await client.query(`
      INSERT INTO trips (title, destination, start_date, end_date) VALUES
      ('Barcelona Adventure', 'Barcelona', '2025-03-15', '2025-03-20'),
      ('Paris Getaway', 'Paris', '2025-04-01', '2025-04-05'),
      ('Tokyo Explorer', 'Tokyo', '2025-05-10', '2025-05-20'),
      ('Rome Discovery', 'Rome', '2025-06-01', '2025-06-07')
    `)

    // Insert trip_permissions (Alice owns trips 1-2, Bob owns trip 3, Charlie owns trip 4)
    await client.query(`
      INSERT INTO trip_permissions (trip_id, user_id, permission_level) VALUES
      (1, 1, 'owner'),
      (2, 1, 'owner'),
      (3, 2, 'owner'),
      (4, 3, 'owner')
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
  } finally {
    client.release()
  }
}

export async function closeDatabase() {
  await pool.end()
}

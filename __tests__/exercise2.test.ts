import request from 'supertest'
import app from '../src/app'
import { pool } from '../src/db'

async function resetDatabase() {
  await pool.query('TRUNCATE payments, bookings, travelers, trips RESTART IDENTITY CASCADE')
}

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await pool.end()
})

describe('Exercise 2: Authentication & Authorization', () => {
  describe('POST /auth/register', () => {
    it('registers user and returns public data', async () => {
      const response = await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization_id: 1,
        })

      expect(response.status).toBe(201)
      expect(response.body.user).toMatchObject({
        email: 'user@example.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
      })
      expect(response.headers['set-cookie']).toBeDefined()
    })
  })

  describe('POST /auth/login', () => {
    it('authenticates user with valid credentials', async () => {
      // Assume user is already registered
      await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization_id: 1,
        })

      const response = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })

      expect(response.status).toBe(200)
      expect(response.body.user.email).toBe('user@example.com')
      expect(response.headers['set-cookie']).toBeDefined()
    })
  })

  describe('GET /auth/me', () => {
    it('returns current user when authenticated', async () => {
      const registerResponse = await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization_id: 1,
        })

      const cookies = registerResponse.headers['set-cookie']

      const response = await request(app.callback())
        .get('/auth/me')
        .set('Cookie', cookies)

      expect(response.status).toBe(200)
      expect(response.body.user.email).toBe('user@example.com')
    })

    it('returns 401 when not authenticated', async () => {
      const response = await request(app.callback()).get('/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Authentication required')
    })
  })

  describe('POST /auth/logout', () => {
    it('logs out authenticated user', async () => {
      const registerResponse = await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          first_name: 'Ada',
          last_name: 'Lovelace',
          organization_id: 1,
        })

      const cookies = registerResponse.headers['set-cookie']

      const response = await request(app.callback())
        .post('/auth/logout')
        .set('Cookie', cookies)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Logged out successfully')
      expect(response.headers['set-cookie'][0]).toContain('session=');
    })
  })

  describe('Trips authorization', () => {
    it('requires authentication to create a trip', async () => {
      const response = await request(app.callback()).post('/trips').send({
        title: 'Paris Getaway',
        destination: 'Paris',
        start_date: '2025-06-01',
        end_date: '2025-06-07',
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Authentication required')
    })

    it('prevents other users from accessing private trips', async () => {
      const ownerResponse = await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'owner@example.com',
          password: 'password123',
          first_name: 'Owner',
          last_name: 'User',
          organization_id: 1,
        })

      const ownerCookies = ownerResponse.headers['set-cookie']

      const tripResponse = await request(app.callback())
        .post('/trips')
        .set('Cookie', ownerCookies)
        .send({
          title: 'Owner Trip',
          destination: 'Rome',
          start_date: '2025-07-01',
          end_date: '2025-07-07',
        })

      const otherUserResponse = await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'password123',
          first_name: 'Other',
          last_name: 'User',
          organization_id: 2,
        })

      const otherCookies = otherUserResponse.headers['set-cookie']

      const response = await request(app.callback())
        .get(`/trips/${tripResponse.body.id}`)
        .set('Cookie', otherCookies)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Access denied')
    })
  })

  describe('Bookings remain public', () => {
    it('allows creating booking without authentication', async () => {
      const trip = await pool.query(
        `INSERT INTO trips (title, destination, start_date, end_date)
         VALUES ('Test', 'Test City', '2025-01-01', '2025-01-05')
         RETURNING id`
      )

      const traveler = await pool.query(
        `INSERT INTO travelers (first_name, last_name, email)
         VALUES ('John', 'Doe', 'john@example.com')
         RETURNING id`
      )

      const response = await request(app.callback()).post('/bookings').send({
        trip_id: trip.rows[0].id,
        traveler_id: traveler.rows[0].id,
      })

      expect(response.status).toBe(201)
      expect(response.body.trip_id).toBe(trip.rows[0].id)
      expect(response.body.traveler_id).toBe(traveler.rows[0].id)
    })
  })
})

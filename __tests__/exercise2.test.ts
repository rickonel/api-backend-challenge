import request from 'supertest'
import app from '../src/index'
import { setupDatabase, closeDatabase } from './helpers'

describe('Exercise 2: Authentication & Authorization', () => {
  let aliceCookie: string
  let bobCookie: string

  beforeAll(async () => {
    await setupDatabase()
  })

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const timestamp = Date.now()
      const response = await request(app.callback())
        .post('/auth/register')
        .send({
          email: `testuser${timestamp}@test.com`,
          password: 'testpassword123',
          first_name: 'Test',
          last_name: 'User',
          organization_id: 1,
        })
        .expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('email', `testuser${timestamp}@test.com`)
      expect(response.body.user).not.toHaveProperty('password')
      expect(response.headers['set-cookie']).toBeDefined()
    })
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'alice@wanderlust.com',
          password: 'password123',
        })
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('email', 'alice@wanderlust.com')
      expect(response.headers['set-cookie']).toBeDefined()
      
      // Save cookie for subsequent tests
      aliceCookie = response.headers['set-cookie'][0]
    })

    it('should reject invalid credentials', async () => {
      await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'alice@wanderlust.com',
          password: 'wrongpassword',
        })
        .expect(401)
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user when authenticated', async () => {
      const response = await request(app.callback())
        .get('/auth/me')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body.user).toHaveProperty('email', 'alice@wanderlust.com')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return 401 when not authenticated', async () => {
      await request(app.callback())
        .get('/auth/me')
        .expect(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout current user', async () => {
      const response = await request(app.callback())
        .post('/auth/logout')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Logged out successfully')
    })
  })

  describe('Trip Authorization', () => {
    beforeAll(async () => {
      // Login Alice
      const aliceRes = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'alice@wanderlust.com', password: 'password123' })
      aliceCookie = aliceRes.headers['set-cookie'][0]

      // Login Bob
      const bobRes = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'bob@wanderlust.com', password: 'password123' })
      bobCookie = bobRes.headers['set-cookie'][0]
    })

    it('should require authentication to create trips', async () => {
      await request(app.callback())
        .post('/trips')
        .send({
          title: 'Test Trip',
          destination: 'Madrid',
          start_date: '2025-07-01',
          end_date: '2025-07-05',
        })
        .expect(401)
    })

    it('should create trip when authenticated', async () => {
      const response = await request(app.callback())
        .post('/trips')
        .set('Cookie', aliceCookie)
        .send({
          title: 'Madrid Adventure',
          destination: 'Madrid',
          start_date: '2025-07-01',
          end_date: '2025-07-05',
        })
        .expect(201)

      expect(response.body).toHaveProperty('title', 'Madrid Adventure')
      expect(response.body).toHaveProperty('destination', 'Madrid')
    })

    it('should make trips private by default', async () => {
      // Alice tries to access Bob's trip (trip 3)
      await request(app.callback())
        .get('/trips/3')
        .set('Cookie', aliceCookie)
        .expect(403)
    })

    it('should allow travelers to create bookings without authentication', async () => {
      const response = await request(app.callback())
        .post('/bookings')
        .send({
          trip_id: 1,
          traveler_id: 1,
          status: 'pending',
        })
        .expect(201)

      expect(response.body).toHaveProperty('status', 'pending')
    })
  })
})

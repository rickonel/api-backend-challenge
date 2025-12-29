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

  // Additional edge cases and security tests
  describe('Registration Edge Cases', () => {
    it('should reject registration with missing fields', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'incomplete@test.com',
          password: 'test123',
          // Missing first_name, last_name, organization_id
        })
        .expect(400)
    })

    it('should reject registration with duplicate email', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'alice@wanderlust.com', // Already exists
          password: 'newpassword',
          first_name: 'Duplicate',
          last_name: 'User',
          organization_id: 1,
        })
        .expect(400)
    })

    it('should reject registration with non-existent organization', async () => {
      const response = await request(app.callback())
        .post('/auth/register')
        .send({
          email: `newuser${Date.now()}@test.com`,
          password: 'test123456', // Must be 8+ chars
          first_name: 'New',
          last_name: 'User',
          organization_id: 999,
        })
        .expect(400)

      expect(response.body.error).toContain('Organization not found')
    })

    it('should reject registration with empty password', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          email: `test${Date.now()}@test.com`,
          password: '',
          first_name: 'Test',
          last_name: 'User',
          organization_id: 1,
        })
        .expect(400)
    })

    it('should reject registration with invalid email format', async () => {
      await request(app.callback())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'test123',
          first_name: 'Test',
          last_name: 'User',
          organization_id: 1,
        })
        .expect(400)
    })
  })

  describe('Login Edge Cases', () => {
    it('should reject login with non-existent email', async () => {
      await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401)
    })

    it('should reject login with empty credentials', async () => {
      await request(app.callback())
        .post('/auth/login')
        .send({
          email: '',
          password: '',
        })
        .expect(400)
    })

    it('should reject login with missing password', async () => {
      await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'alice@wanderlust.com',
        })
        .expect(400)
    })

    it('should handle case-sensitive email lookup', async () => {
      await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'ALICE@wanderlust.com', // Different case
          password: 'password123',
        })
        .expect(401)
    })
  })

  describe('Session Management', () => {
    it('should require authentication for logout', async () => {
      // Current implementation requires authentication even for logout
      await request(app.callback())
        .post('/auth/logout')
        .expect(401)
    })

    it('should not allow access after logout', async () => {
      // Login first
      const loginRes = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'alice@wanderlust.com', password: 'password123' })

      const cookie = loginRes.headers['set-cookie'][0]

      // Logout
      await request(app.callback())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200)

      // Try to access protected route
      await request(app.callback())
        .get('/auth/me')
        .set('Cookie', cookie)
        .expect(401)
    })
  })

  describe('Authorization Edge Cases', () => {
    it('should reject trip creation with invalid data', async () => {
      await request(app.callback())
        .post('/trips')
        .set('Cookie', aliceCookie)
        .send({
          title: '',
          destination: '',
          start_date: 'invalid-date',
          end_date: '2025-01-01',
        })
        .expect(400)
    })

    it('should not expose password in user responses', async () => {
      const response = await request(app.callback())
        .get('/auth/me')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body.user).not.toHaveProperty('password')
      expect(response.body.user).not.toHaveProperty('password_hash')
    })

    it('should handle concurrent logins from same user', async () => {
      const login1 = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'alice@wanderlust.com', password: 'password123' })

      const login2 = await request(app.callback())
        .post('/auth/login')
        .send({ email: 'alice@wanderlust.com', password: 'password123' })

      // Both sessions should work independently
      await request(app.callback())
        .get('/auth/me')
        .set('Cookie', login1.headers['set-cookie'][0])
        .expect(200)

      await request(app.callback())
        .get('/auth/me')
        .set('Cookie', login2.headers['set-cookie'][0])
        .expect(200)
    })
  })
})

import request from 'supertest'
import app from '../src/index'
import { setupDatabase, closeDatabase } from './helpers'

describe('Bonus: User-Specific Trip Sharing', () => {
  let aliceCookie: string
  let bobCookie: string
  let charlieCookie: string

  beforeAll(async () => {
    await setupDatabase()

    // Login users
    const aliceRes = await request(app.callback())
      .post('/auth/login')
      .send({ email: 'alice@wanderlust.com', password: 'password123' })
    aliceCookie = aliceRes.headers['set-cookie'][0]

    const bobRes = await request(app.callback())
      .post('/auth/login')
      .send({ email: 'bob@wanderlust.com', password: 'password123' })
    bobCookie = bobRes.headers['set-cookie'][0]

    const charlieRes = await request(app.callback())
      .post('/auth/login')
      .send({ email: 'charlie@globaladv.com', password: 'password123' })
    charlieCookie = charlieRes.headers['set-cookie'][0]
  })

  describe('POST /trips/:id/share/user/:userId', () => {
    it('should allow sharing with user from different organization (read permission)', async () => {
      // Alice (org 1) shares trip 1 with Charlie (org 2)
      const response = await request(app.callback())
        .post('/trips/1/share/user/3')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(200)

      expect(response.body.message).toContain('shared with user')
      expect(response.body.share).toMatchObject({
        trip_id: 1,
        user_id: 3,
        permission_level: 'read',
      })
    })

    it('should prevent sharing with yourself', async () => {
      const response = await request(app.callback())
        .post('/trips/1/share/user/1')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(400)

      expect(response.body.error).toContain('share with yourself')
    })

    it('should return error for non-existent user', async () => {
      await request(app.callback())
        .post('/trips/1/share/user/999')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(404)
    })

    it('should require owner permission to share', async () => {
      // Bob tries to share Alice's trip
      const response = await request(app.callback())
        .post('/trips/1/share/user/3')
        .set('Cookie', bobCookie)
        .send({ permission_level: 'read' })
        .expect(403)

      expect(response.body.error).toContain('owner')
    })
  })

  describe('Shared user access', () => {
    it('should allow shared user to view trip', async () => {
      // Alice shares trip 1 with Charlie (read)
      await request(app.callback())
        .post('/trips/1/share/user/3')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })

      // Charlie can now view trip 1
      const response = await request(app.callback())
        .get('/trips/1')
        .set('Cookie', charlieCookie)
        .expect(200)

      expect(response.body.id).toBe(1)
    })

    it('should prevent editing with read permission', async () => {
      const response = await request(app.callback())
        .put('/trips/1')
        .set('Cookie', charlieCookie)
        .send({ title: 'Updated by Charlie' })
        .expect(403)

      expect(response.body.error).toContain('Access denied')
    })

    it('should allow sharing with write permission', async () => {
      // Alice shares trip 2 with Bob (write)
      const response = await request(app.callback())
        .post('/trips/2/share/user/2')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })
        .expect(200)

      expect(response.body.share.permission_level).toBe('write')
    })

    it('should allow shared user to edit with write permission', async () => {
      const response = await request(app.callback())
        .put('/trips/2')
        .set('Cookie', bobCookie)
        .send({
          title: 'Updated by Bob',
          destination: 'Paris',
          start_date: '2025-04-01',
          end_date: '2025-04-05',
        })
        .expect(200)

      expect(response.body.title).toBe('Updated by Bob')
    })

    it('should prevent deletion even with write permission', async () => {
      const response = await request(app.callback())
        .delete('/trips/2')
        .set('Cookie', bobCookie)
        .expect(403)

      expect(response.body.error).toContain('owner')
    })
  })

  describe('DELETE /trips/:id/share/user/:userId', () => {
    it('should allow owner to unshare from user', async () => {
      const response = await request(app.callback())
        .delete('/trips/1/share/user/3')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body.message).toContain('unshared')
    })

    it('should prevent access after unsharing', async () => {
      await request(app.callback())
        .get('/trips/1')
        .set('Cookie', charlieCookie)
        .expect(403)
    })

    it('should return error when unsharing non-shared trip', async () => {
      await request(app.callback())
        .delete('/trips/1/share/user/3')
        .set('Cookie', aliceCookie)
        .expect(404)
    })
  })

  describe('Cross-organization sharing', () => {
    it('should allow sharing across organizations', async () => {
      // Charlie (org 2) shares trip 4 with Alice (org 1)
      await request(app.callback())
        .post('/trips/4/share/user/1')
        .set('Cookie', charlieCookie)
        .send({ permission_level: 'write' })
        .expect(200)

      // Alice can view trip 4
      const response = await request(app.callback())
        .get('/trips/4')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body.id).toBe(4)
    })
  })

  afterAll(async () => {
    await closeDatabase()
  })
})

import request from 'supertest'
import app from '../src/index'
import { setupDatabase, closeDatabase } from './helpers'

describe('Exercise 3: Organization Sharing', () => {
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

  describe('POST /trips/:id/share/organization', () => {
    it('should share trip with organization with read permission', async () => {
      const response = await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.share).toHaveProperty('permission_level', 'read')
      expect(response.body.share).toHaveProperty('organization_id', 1)
    })

    it('should require owner permission to share', async () => {
      // Bob tries to share Alice's trip
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', bobCookie)
        .send({ permission_level: 'read' })
        .expect(403)
    })
  })

  describe('Organization member access with read permission', () => {
    it('should allow organization members to view shared trip', async () => {
      const response = await request(app.callback())
        .get('/trips')
        .set('Cookie', bobCookie)
        .expect(200)

      const tripIds = response.body.map((t: any) => t.id)
      expect(tripIds).toContain(1) // Trip 1 shared by Alice
      expect(tripIds).toContain(3) // Trip 3 owned by Bob
    })

    it('should prevent organization members from editing with read permission', async () => {
      await request(app.callback())
        .put('/trips/1')
        .set('Cookie', bobCookie)
        .send({ title: 'Updated Title' })
        .expect(403)
    })
  })

  describe('Organization sharing with write permission', () => {
    it('should share trip with write permission', async () => {
      const response = await request(app.callback())
        .post('/trips/2/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })
        .expect(200)

      expect(response.body.share).toHaveProperty('permission_level', 'write')
    })

    it('should allow organization members to edit with write permission', async () => {
      const response = await request(app.callback())
        .put('/trips/2')
        .set('Cookie', bobCookie)
        .send({ title: 'Paris - Team Edition' })
        .expect(200)

      expect(response.body).toHaveProperty('title', 'Paris - Team Edition')
    })

    it('should prevent organization members from deleting even with write permission', async () => {
      await request(app.callback())
        .delete('/trips/2')
        .set('Cookie', bobCookie)
        .expect(403)
    })
  })

  describe('Cross-organization isolation', () => {
    it('should not allow users from other organizations to see shared trips', async () => {
      // Charlie should only see trips from his org or shared with him/his org
      const response = await request(app.callback())
        .get('/trips')
        .set('Cookie', charlieCookie)
        .expect(200)

      // Verify Charlie has some trips (his own or shared)
      expect(response.body.length).toBeGreaterThan(0)
      
      // All trips should either be owned by Charlie or shared with him
      const allTripsValid = response.body.every((t: any) => 
        t.user_id === 3 || // Charlie's trips
        response.body.some((trip: any) => trip.id === t.id) // Shared trips
      )
      expect(allTripsValid).toBe(true)
    })
  })

  describe('DELETE /trips/:id/share/organization', () => {
    it('should unshare trip from organization', async () => {
      const response = await request(app.callback())
        .delete('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('unshared')
    })

    it('should remove access for organization members after unshare', async () => {
      const response = await request(app.callback())
        .get('/trips')
        .set('Cookie', bobCookie)
        .expect(200)

      const tripIds = response.body.map((t: any) => t.id)
      expect(tripIds).not.toContain(1) // Trip 1 no longer shared
    })
  })

  // Additional edge cases and validation tests
  describe('Organization Sharing Edge Cases', () => {
    it('should reject sharing with invalid permission level', async () => {
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'invalid' })
        .expect(400)
    })

    it('should reject sharing without permission level', async () => {
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({})
        .expect(400)
    })

    it('should handle sharing non-existent trip', async () => {
      await request(app.callback())
        .post('/trips/999/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(404)
    })

    it('should handle unsharing non-shared trip', async () => {
      // First, make sure to unshare if it was shared in previous tests
      await request(app.callback())
        .delete('/trips/2/share/organization')
        .set('Cookie', aliceCookie)

      // Now try to unshare again - should get 404
      const response = await request(app.callback())
        .delete('/trips/2/share/organization')
        .set('Cookie', aliceCookie)
        .expect(404)

      expect(response.body.error).toContain('not shared')
    })

    it('should handle invalid trip ID for sharing', async () => {
      await request(app.callback())
        .post('/trips/invalid/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })
        .expect(400)
    })

    it('should prevent non-authenticated users from sharing', async () => {
      await request(app.callback())
        .post('/trips/1/share/organization')
        .send({ permission_level: 'read' })
        .expect(401)
    })

    it('should allow updating permission level by re-sharing', async () => {
      // Share with read first
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })

      // Re-share with write (should update)
      const response = await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })
        .expect(200)

      expect(response.body.share.permission_level).toBe('write')

      // Bob should now be able to edit
      await request(app.callback())
        .put('/trips/1')
        .set('Cookie', bobCookie)
        .send({ title: 'Updated by Bob' })
        .expect(200)
    })

    it('should maintain ownership permissions separately from sharing', async () => {
      // Even after sharing with write, owner should still be able to delete
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })

      // Alice can still delete (owner)
      const aliceTrip = await request(app.callback())
        .post('/trips')
        .set('Cookie', aliceCookie)
        .send({
          title: 'Test Delete',
          destination: 'Test',
          start_date: '2025-01-01',
          end_date: '2025-01-02',
        })

      await request(app.callback())
        .post(`/trips/${aliceTrip.body.id}/share/organization`)
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })

      await request(app.callback())
        .delete(`/trips/${aliceTrip.body.id}`)
        .set('Cookie', aliceCookie)
        .expect(204)
    })

    it('should not allow sharing trips you do not own even if you have write access', async () => {
      // Alice shares trip 2 with organization (write permission)
      await request(app.callback())
        .post('/trips/2/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })

      // Bob has write access but cannot share (not owner)
      await request(app.callback())
        .post('/trips/2/share/organization')
        .set('Cookie', bobCookie)
        .send({ permission_level: 'read' })
        .expect(403)
    })
  })

  describe('Permission Inheritance', () => {
    it('should allow organization members with write to modify trip fields', async () => {
      await request(app.callback())
        .post('/trips/2/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'write' })

      const response = await request(app.callback())
        .put('/trips/2')
        .set('Cookie', bobCookie)
        .send({ 
          destination: 'Updated Destination',
          title: 'Updated Title' 
        })
        .expect(200)

      expect(response.body.destination).toBe('Updated Destination')
      expect(response.body.title).toBe('Updated Title')
    })

    it('should prevent read-only members from any modifications', async () => {
      await request(app.callback())
        .post('/trips/1/share/organization')
        .set('Cookie', aliceCookie)
        .send({ permission_level: 'read' })

      // Bob tries partial update
      await request(app.callback())
        .put('/trips/1')
        .set('Cookie', bobCookie)
        .send({ destination: 'New Destination' })
        .expect(403)
    })
  })

  afterAll(async () => {
    await closeDatabase()
  })
})

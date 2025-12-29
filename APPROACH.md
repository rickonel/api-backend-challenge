# Approach and Trade-offs

## Table of Contents
1. [Initial Project Analysis](#initial-project-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Exercise Solutions](#exercise-solutions)
4. [Key Design Decisions](#key-design-decisions)
5. [Design Patterns](#design-patterns)
6. [Database Schema](#database-schema)
7. [Architecture Diagram](#architecture-diagram)
8. [Trade-offs and Limitations](#trade-offs-and-limitations)

---

## Initial Project Analysis

### Project Base
The project started with a REST API for managing trips, bookings, payments, and travelers using:
- **Node.js v24+** with TypeScript 5.7
- **Koa.js 2.15** - Lightweight web framework
- **PostgreSQL 16.3** - Relational database
- **Zod** - Runtime type validation
- **Jest + Supertest** - Testing framework

### Initial Assessment

**Strengths:**
- ✅ Clean project structure with separation of routes, middleware, models, schemas
- ✅ Type safety with TypeScript + Zod
- ✅ Basic CRUD operations implemented
- ✅ Docker setup for easy development

**Gaps Identified:**
- ❌ No authentication/authorization system
- ❌ No data consistency guarantees (transactions)
- ❌ Hardcoded secrets in configuration
- ❌ No booking cancellation logic
- ❌ No sharing/permissions system
- ❌ Limited test coverage
- ❌ Code duplication in middleware

---

## Architecture Overview

### Layered Architecture (MVC adapted for Koa.js)

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer                             │
│  - Routes (API endpoints)                                   │
│  - Request/Response handling                                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Middleware Layer                           │
│  - Request validation (Zod schemas)                         │
│  - Authentication/Authorization                             │
│  - Business logic orchestration                             │
│  - Error handling                                           │
│  - Response formatting                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    Model Layer                              │
│  - Database queries (SQL)                                   │
│  - Data access logic                                        │
│  - Transaction management                                   │
│  - Business rules enforcement                               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Database Layer                             │
│  - PostgreSQL 16.3                                          │
│  - Connection pool management                               │
│  - ACID transactions                                        │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles Applied

1. **Separation of Concerns**: Each layer has a single responsibility
2. **DRY (Don't Repeat Yourself)**: Shared utilities for common operations
3. **Type Safety**: TypeScript + Zod for compile-time and runtime validation
4. **SOLID Principles**: Particularly Single Responsibility and Dependency Inversion
5. **Security First**: Authentication, authorization, environment variables

---

## Exercise Solutions

### Exercise 1: Booking Cancellation with Automatic Refunds

#### Analysis

**Requirements:**
- Cancel a booking by changing status to 'cancelled'
- If a completed payment exists, create a refund payment
- Refund amount should be negative value of original payment
- Maintain audit trail (original payment remains 'completed')

**Challenges Identified:**
1. **Atomicity**: Two operations (update booking + create refund) must succeed together
2. **Data Consistency**: What if refund creation fails after booking is cancelled?
3. **Multiple Payments**: Handle bookings with multiple payments correctly
4. **Idempotency**: Prevent double refunds

#### Design Decision

**Option 1: Sequential Operations (❌ Rejected)**
```typescript
await BookingModel.update(id, { status: 'cancelled' })
await PaymentModel.create({ /* refund */ })
// Problem: If step 2 fails, booking is cancelled but no refund!
```

**Option 2: ACID Transaction (✅ Selected)**
```typescript
await withTransaction(async (client) => {
  await client.query('UPDATE bookings SET status = $1...', ['cancelled', id])
  await client.query('INSERT INTO payments...', [refund data])
  // Both commit together or both rollback!
})
```

**Why Transaction?**
- Ensures **atomicity**: Both operations succeed or both fail
- Prevents **partial state**: No cancelled bookings without refunds
- Maintains **data integrity**: Consistent state always
- Enables **error recovery**: Automatic rollback on failure

#### Implementation

**1. Created Transaction Utility** ([src/utils/transaction.ts](src/utils/transaction.ts))
```typescript
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

**2. Implemented Business Logic in Model** ([src/models/bookingModel.ts](src/models/bookingModel.ts))
```typescript
async function cancelWithRefund(id: number): Promise<CancelBookingResult> {
  return withTransaction(async (client: PoolClient) => {
    // Step 1: Update booking status
    const updatedBooking = await client.query<Booking>(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', id]
    )

    // Step 2: Find latest completed payment
    const completedPayment = await client.query<Payment>(
      `SELECT * FROM payments 
       WHERE booking_id = $1 AND status = 'completed'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [id]
    )

    // Step 3: Create refund if payment exists
    let refund: Payment | undefined
    if (completedPayment.rows[0]) {
      const amount = Number(completedPayment.rows[0].amount)
      const refundAmount = -Math.abs(amount)
      
      const refundResult = await client.query<Payment>(
        `INSERT INTO payments (booking_id, amount, currency, status)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, refundAmount, completedPayment.rows[0].currency, 'refunded']
      )
      refund = refundResult.rows[0]
    }

    return { booking: updatedBooking.rows[0], refund }
  })
}
```

**3. Clean Middleware** ([src/middleware/bookingsMiddleware.ts](src/middleware/bookingsMiddleware.ts))
```typescript
export async function cancelBooking(ctx: Context) {
  const id = parseId(ctx)
  const booking = await requireResource(ctx, () => BookingModel.findById(id), 'Booking')

  if (booking.status === 'cancelled') {
    ctx.throw(400, 'Booking is already cancelled')
  }

  const result = await BookingModel.cancelWithRefund(id)

  ctx.body = {
    booking: result.booking,
    ...(result.refund ? { refund: result.refund } : {}),
  }
}
```

#### Testing Strategy

**Test Coverage: 23 tests**
- Basic cancellation with refund
- Already cancelled booking (error case)
- Non-existent booking (error case)
- Booking without payments
- Pending payment (no refund)
- Multiple payments (use latest completed)
- Original payment remains completed
- Currency preservation
- Edge cases: large amounts, zero amounts, fractional amounts, negative IDs
- Double refund prevention
- Invalid booking IDs

---

### Exercise 2: Authentication & Authorization

#### Analysis

**Requirements:**
- User registration with organization assignment
- Secure login with session management
- Trip ownership (users can only manage their own trips)
- Public endpoints for travelers/bookings (backward compatibility)

**Security Considerations:**
1. **Password Security**: Never store plain passwords
2. **Session Management**: Secure, HTTP-only cookies
3. **Authorization**: Owner-based access control
4. **CSRF Protection**: Cookie-based authentication
5. **Session Expiry**: Time-limited sessions

#### Design Decision

**Authentication Approach:**

**Option 1: JWT Tokens (❌ Rejected)**
- ❌ Requires token validation on every request
- ❌ Cannot revoke tokens easily
- ❌ Token size overhead

**Option 2: Session-based (✅ Selected)**
- ✅ Server-side session storage in database
- ✅ Easy revocation (delete session)
- ✅ Minimal cookie size
- ✅ Secure with HTTP-only flag

**Password Hashing:**
- Used Node.js crypto `scrypt` (PBKDF2-like)
- Random salt per password
- 64-byte derived key
- Format: `derivedKey.salt`

#### Implementation

**1. Password Utilities** ([src/utils/crypto.ts](src/utils/crypto.ts))
```typescript
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${derivedKey.toString('hex')}.${salt}`
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const [storedHash, salt] = hash.split('.')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return timingSafeEqual(Buffer.from(storedHash, 'hex'), derivedKey)
}
```

**2. Database Schema**
```sql
-- Organizations table
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**3. Trip Permissions** ([src/models/tripPermissionModel.ts](src/models/tripPermissionModel.ts))
```sql
CREATE TABLE trip_permissions (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, user_id)
);
```

**4. Authentication Middleware** ([src/middleware/requireAuth.ts](src/middleware/requireAuth.ts))
```typescript
export async function authenticate(ctx: Context, next: Next) {
  const sessionId = ctx.cookies.get('session_id')
  
  if (!sessionId) {
    await next()
    return
  }

  const session = await SessionModel.findByIdAndNotExpired(sessionId)
  if (!session) {
    ctx.cookies.set('session_id', '', { maxAge: 0 })
    await next()
    return
  }

  const user = await UserModel.findByIdPublic(session.user_id)
  if (user) {
    ctx.state.user = user
  }

  await next()
}

export async function requireAuth(ctx: Context, next: Next) {
  if (!ctx.state.user) ctx.throw(401, 'Authentication required')
  await next()
}
```

**5. Trip Creation with Ownership** ([src/models/tripModel.ts](src/models/tripModel.ts))
```typescript
async function createWithOwner(data: TripCreate, userId: number): Promise<Trip> {
  return withTransaction(async (client: PoolClient) => {
    // Create trip
    const trip = await client.query<Trip>(
      'INSERT INTO trips (...) VALUES (...) RETURNING *',
      [data.title, data.destination, data.start_date, data.end_date]
    )

    // Assign owner permission
    await client.query(
      `INSERT INTO trip_permissions (trip_id, user_id, permission_level)
       VALUES ($1, $2, 'owner')`,
      [trip.rows[0].id, userId]
    )

    return trip.rows[0]
  })
}
```

#### Testing Strategy

**Test Coverage: 23 tests**
- User registration (success, duplicate email, invalid organization)
- Login (success, invalid credentials, non-existent user)
- Session management (current user, logout, expired sessions)
- Trip authorization (require auth, private by default, owner access)
- Edge cases: missing fields, weak passwords, concurrent sessions
- Security: password not in responses, case-sensitive emails

---

### Exercise 3: Organization Sharing

#### Analysis

**Requirements:**
- Owner can share trip with their organization
- Read permission: view trip
- Write permission: edit trip (but not delete)
- Only owner can share/unshare
- Organization members inherit permissions

**Challenges:**
1. **Permission Hierarchy**: Owner > Write > Read
2. **Permission Inheritance**: All org members get access
3. **Authorization Logic**: Check individual + org permissions
4. **Idempotency**: Update existing shares instead of failing

#### Design Decision

**Database Design:**

**Option 1: Individual Shares Only (❌ Rejected)**
- Share with each user individually
- ❌ Doesn't scale (large organizations)
- ❌ Complex management
- ❌ Permission updates difficult

**Option 2: Organization-Level Shares (✅ Selected)**
```sql
CREATE TABLE organization_trip_shares (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL,
  PRIMARY KEY (trip_id, organization_id)
);
```
- ✅ Scales to any organization size
- ✅ Simple permission management
- ✅ Efficient queries
- ✅ One record per share

**Upsert Pattern:**
```sql
INSERT INTO organization_trip_shares (trip_id, organization_id, permission_level)
VALUES ($1, $2, $3)
ON CONFLICT (trip_id, organization_id) 
DO UPDATE SET permission_level = $3
RETURNING *
```
- ✅ Prevents duplicate key errors
- ✅ Idempotent (same request twice is safe)
- ✅ Atomic operation
- ✅ Updates permission level if already exists

#### Implementation

**1. Permission Checking** ([src/models/tripPermissionModel.ts](src/models/tripPermissionModel.ts))
```typescript
export async function userCanAccessTrip(tripId: number, userId: number): Promise<boolean> {
  // Check individual permissions (owner, read, write)
  const individualPerm = await executeQuery(
    'SELECT true FROM trip_permissions WHERE trip_id = $1 AND user_id = $2',
    [tripId, userId]
  )
  if (individualPerm.rows[0]) return true

  // Check user-specific shares
  const userShare = await UserTripShareModel.getUserPermission(tripId, userId)
  if (userShare) return true

  // Check organization shares
  const userOrg = await executeQuery(
    'SELECT organization_id FROM users WHERE id = $1',
    [userId]
  )
  if (!userOrg.rows[0]) return false

  const orgPerm = await getOrganizationPermission(tripId, userOrg.rows[0].organization_id)
  return orgPerm !== null
}

export async function userCanEditTrip(tripId: number, userId: number): Promise<boolean> {
  // Check if owner
  const ownerPerm = await executeQuery(
    `SELECT permission_level FROM trip_permissions 
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId]
  )
  if (ownerPerm.rows[0]?.permission_level === 'owner') return true

  // Check user-specific write permission
  const userPerm = await UserTripShareModel.getUserPermission(tripId, userId)
  if (userPerm === 'write') return true

  // Check organization write permission
  const userOrg = await executeQuery(
    'SELECT organization_id FROM users WHERE id = $1',
    [userId]
  )
  if (!userOrg.rows[0]) return false

  const orgPerm = await getOrganizationPermission(tripId, userOrg.rows[0].organization_id)
  return orgPerm === 'write'
}
```

**2. Sharing Endpoints** ([src/middleware/tripsMiddleware.ts](src/middleware/tripsMiddleware.ts))
```typescript
export async function shareWithOrganization(ctx: Context) {
  const tripId = parseId(ctx)
  const user = requireUser(ctx)

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  const data = validateBody(ctx, shareWithOrganizationSchema)

  const share = await OrganizationTripShareModel.create(
    tripId,
    user.organization_id,
    data.permission_level
  )

  ctx.body = {
    message: 'Trip shared with organization successfully',
    share,
  }
}
```

#### Testing Strategy

**Test Coverage: 21 tests**
- Share with read permission
- Share with write permission
- Require owner to share
- Organization members can view shared trips
- Read permission prevents editing
- Write permission allows editing
- Write permission doesn't allow deletion (only owner)
- Unshare from organization
- Cross-organization isolation
- Permission level updates
- Edge cases: invalid permissions, non-existent trips, unauthenticated access

---

### Bonus: User-Specific Sharing

#### Analysis

**Extension of Exercise 3:**
- Share trips with individual users (cross-organization)
- Same permission levels (read, write)
- User-specific shares override organization shares
- Owner can share with any user

**New Complexity:**
- Permission priority: Individual > Organization
- Cross-organization sharing
- Cannot share with yourself

#### Implementation

**Database Schema:**
```sql
CREATE TABLE user_trip_shares (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('read', 'write')),
  PRIMARY KEY (trip_id, user_id)
);
```

**Permission Hierarchy:**
```
1. trip_permissions (owner)
2. user_trip_shares (individual)
3. organization_trip_shares (organization-wide)
```

**Share Logic** ([src/middleware/tripsMiddleware.ts](src/middleware/tripsMiddleware.ts))
```typescript
export async function shareWithUser(ctx: Context) {
  const tripId = parseId(ctx)
  const targetUserId = parseId(ctx, 'userId')
  const user = requireUser(ctx)

  await requireResource(ctx, () => TripModel.findById(tripId), 'Trip')
  await requireTripOwnership(ctx, tripId)

  if (targetUserId === user.id) {
    ctx.throw(400, 'Cannot share with yourself')
  }

  await requireResource(ctx, () => UserModel.findByIdPublic(targetUserId), 'User')

  const data = validateBody(ctx, shareWithUserSchema)

  const share = await UserTripShareModel.create(tripId, targetUserId, data.permission_level)

  ctx.body = {
    message: 'Trip shared with user successfully',
    share,
  }
}
```

#### Testing Strategy

**Test Coverage: 26 tests**
- Cross-organization sharing
- Share with read/write permissions
- Prevent sharing with yourself
- User-specific permissions override organization permissions
- Non-owner cannot share
- Permission updates via re-sharing
- Unshare from specific user
- Edge cases: invalid user IDs, negative IDs, non-existent users
- Multiple users with different permissions
- Separated organization and user permissions

---

## Key Design Decisions

### 1. Transaction Management

**Decision:** Use database transactions for multi-step operations

**Rationale:**
- **createTrip()**: Trip + owner permission must succeed together
- **cancelBooking()**: Booking update + refund must be atomic

**Alternative Considered:** Sequential operations
- ❌ Risk of partial failures
- ❌ Data consistency issues
- ❌ Difficult error recovery

**Trade-off:**
- ✅ Guarantees data integrity
- ⚠️ Slightly more complex code
- ⚠️ Holds database connection longer

### 2. Password Hashing

**Decision:** Use Node.js crypto `scrypt` with random salts

**Rationale:**
- Built into Node.js (no external dependencies)
- PBKDF2-like key derivation
- Resistant to rainbow tables
- Configurable iterations

**Alternative Considered:** bcrypt library
- ✅ Industry standard
- ❌ Native dependency (compilation issues)
- ❌ Additional package

**Trade-off:**
- ✅ No external dependencies
- ✅ Good security
- ⚠️ Not as battle-tested as bcrypt

### 3. Session Storage

**Decision:** Database-backed sessions

**Rationale:**
- Persistent across server restarts
- Easy revocation (delete from database)
- Audit trail of user sessions
- Scales horizontally with database replication

**Alternative Considered:** In-memory sessions (Redis)
- ✅ Faster access
- ❌ Additional infrastructure
- ❌ Complexity for this project size

**Trade-off:**
- ✅ Simple setup
- ✅ Persistent
- ⚠️ Database query on each authenticated request

### 4. Permission Model

**Decision:** Separate tables for org and user shares

**Rationale:**
- Clear separation of concerns
- Efficient queries per type
- Easy to add more share types later
- Simpler constraints

**Alternative Considered:** Single shares table with polymorphic key
- ❌ Complex queries
- ❌ Harder to maintain referential integrity
- ❌ Less type-safe

**Trade-off:**
- ✅ Type-safe
- ✅ Clear queries
- ⚠️ More tables to manage

### 5. Code Organization

**Decision:** Separate middleware, models, and utilities

**Rationale:**
- Single Responsibility Principle
- Testability (can test models independently)
- Reusability (utilities used everywhere)
- Maintainability (clear where to make changes)

**Refactoring Example:**
```typescript
// Before: SQL in middleware (❌)
export async function cancelBooking(ctx: Context) {
  const result = await pool.query('UPDATE bookings...', [...])
  // More SQL here...
}

// After: SQL in model (✅)
export async function cancelBooking(ctx: Context) {
  const result = await BookingModel.cancelWithRefund(id)
  ctx.body = result
}
```

**Benefits:**
- ✅ Clean separation
- ✅ Testable models
- ✅ Reusable logic
- ✅ Easier to refactor

---

## Design Patterns

### 1. Repository Pattern (Models)

**What:** Encapsulate data access logic in model classes

**Where:** All `*Model.ts` files

**Why:**
- Centralize database queries
- Abstract SQL from business logic
- Easy to test and mock
- Can swap database implementation

**Example:**
```typescript
// bookingModel.ts
export default {
  findAll,
  findById,
  create,
  update,
  remove,
  cancelWithRefund,  // Business logic
}
```

### 2. Middleware Pattern (Koa.js)

**What:** Chain of responsibility for request processing

**Where:** All middleware functions, `requireAuth`

**Why:**
- Separation of concerns
- Composable logic
- Easy to add/remove features
- Clean error handling

**Example:**
```typescript
router.post('/trips', requireAuth, createTrip)
//                     ^^^^^^^^^^^ Middleware
```

### 3. Factory Pattern (Transaction Wrapper)

**What:** Encapsulate object creation logic

**Where:** `withTransaction()` utility

**Why:**
- Consistent transaction handling
- Automatic cleanup
- Error handling built-in
- Type-safe

**Example:**
```typescript
async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

### 4. Strategy Pattern (Permission Checking)

**What:** Define family of algorithms, make them interchangeable

**Where:** `userCanAccessTrip()`, `userCanEditTrip()`

**Why:**
- Multiple permission sources (individual, user share, org share)
- Easy to add new permission types
- Clear hierarchy

**Example:**
```typescript
async function userCanAccessTrip(tripId: number, userId: number): Promise<boolean> {
  // Strategy 1: Individual permission
  if (await hasIndividualPermission(tripId, userId)) return true
  
  // Strategy 2: User share
  if (await hasUserShare(tripId, userId)) return true
  
  // Strategy 3: Organization share
  if (await hasOrgShare(tripId, userId)) return true
  
  return false
}
```

### 5. Template Method Pattern (Base Share Model)

**What:** Define skeleton of algorithm, let subclasses override steps

**Where:** `BaseTripShareModel` class

**Why:**
- Code reuse between organization and user shares
- Consistent behavior
- Easy to add new share types

**Example:**
```typescript
export abstract class TripShareModel<T extends BaseTripShare, ShareId> {
  protected abstract tableName: string
  protected abstract shareIdColumn: string

  async create(tripId: number, shareId: ShareId, permissionLevel: 'read' | 'write'): Promise<T> {
    const result = await pool.query<T>(
      `INSERT INTO ${this.tableName} (trip_id, ${this.shareIdColumn}, permission_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, ${this.shareIdColumn}) DO UPDATE SET permission_level = $3
       RETURNING *`,
      [tripId, shareId, permissionLevel]
    )
    return result.rows[0]
  }
}
```

### 6. DRY Utilities Pattern

**What:** Extract common operations into reusable utilities

**Where:** `params.ts`, `validation.ts`, `resources.ts`, `auth.ts`

**Why:**
- Eliminate code duplication
- Consistent behavior
- Single point of maintenance
- Type-safe

**Examples:**
```typescript
// Before: Duplicated 20+ times
const id = parseInt(ctx.params.id, 10)
if (isNaN(id)) ctx.throw(400, 'Invalid id')

// After: Reusable utility
const id = parseId(ctx)

// Before: Duplicated everywhere
const trip = await TripModel.findById(id)
if (!trip) ctx.throw(404, 'Trip not found')

// After: Reusable utility
const trip = await requireResource(ctx, () => TripModel.findById(id), 'Trip')
```

---

## Database Schema

### Complete Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  organizations   │
├──────────────────┤
│ • id (PK)        │
│   name           │
│   created_at     │
└────────┬─────────┘
         │ 1
         │
         │ N
         │
┌────────▼─────────┐          ┌─────────────────┐
│     users        │          │    sessions     │
├──────────────────┤          ├─────────────────┤
│ • id (PK)        │ 1     N  │ • id (PK)       │
│   organization_id│◄─────────┤   user_id (FK)  │
│   email (UNIQUE) │          │   expires_at    │
│   password_hash  │          │   created_at    │
│   first_name     │          └─────────────────┘
│   last_name      │
│   created_at     │
└────────┬─────────┘
         │ 1
         │
         │ N
         │
┌────────▼─────────┐          ┌───────────────────────────┐
│      trips       │          │   trip_permissions        │
├──────────────────┤          ├───────────────────────────┤
│ • id (PK)        │ 1     N  │ • trip_id (FK, PK)        │
│   title          │◄─────────┤ • user_id (FK, PK)        │
│   destination    │          │   permission_level        │
│   start_date     │          │   created_at              │
│   end_date       │          └───────────────────────────┘
│   created_at     │
└─┬───────┬────────┘
  │       │
  │ 1     │ 1
  │       │
  │ N     │ N
  │       │
┌─▼───────▼────────┐          ┌──────────────────────────────┐
│    bookings      │          │ organization_trip_shares     │
├──────────────────┤          ├──────────────────────────────┤
│ • id (PK)        │          │ • trip_id (FK, PK)           │
│   trip_id (FK)   │          │ • organization_id (FK, PK)   │
│   traveler_id(FK)│          │   permission_level           │
│   status         │          │   created_at                 │
│   created_at     │          └──────────────────────────────┘
└────────┬─────────┘
         │ 1                  ┌──────────────────────────┐
         │                    │   user_trip_shares       │
         │ N                  ├──────────────────────────┤
         │                    │ • trip_id (FK, PK)       │
┌────────▼─────────┐          │ • user_id (FK, PK)       │
│    payments      │          │   permission_level       │
├──────────────────┤          │   created_at             │
│ • id (PK)        │          └──────────────────────────┘
│   booking_id (FK)│
│   amount         │
│   currency       │          ┌──────────────────┐
│   status         │          │    travelers     │
│   created_at     │          ├──────────────────┤
└──────────────────┘          │ • id (PK)        │
                              │   first_name     │
                              │   last_name      │
                              │   email (UNIQUE) │
                              │   created_at     │
                              └──────────────────┘

LEGEND:
• PK = Primary Key
  FK = Foreign Key
  1:N = One-to-Many Relationship
  ◄─── = Foreign Key Constraint
```

### Table Details

#### organizations
```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_organization_id ON users(organization_id);
```

#### sessions
```sql
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

#### trips
```sql
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### trip_permissions
```sql
CREATE TABLE trip_permissions (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX idx_trip_permissions_user_id ON trip_permissions(user_id);
```

#### organization_trip_shares
```sql
CREATE TABLE organization_trip_shares (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, organization_id)
);
CREATE INDEX idx_organization_trip_shares_org_id ON organization_trip_shares(organization_id);
```

#### user_trip_shares
```sql
CREATE TABLE user_trip_shares (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('read', 'write')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX idx_user_trip_shares_user_id ON user_trip_shares(user_id);
```

#### bookings
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  traveler_id INTEGER NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
```

#### payments
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
```

#### travelers
```sql
CREATE TABLE travelers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│  - Web Browser / Mobile App / API Client                           │
│  - HTTP/HTTPS Requests                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Request
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        KOA.JS SERVER                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Global Middleware Chain                        │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  1. Error Handler (try/catch all requests)                  │  │
│  │  2. CORS (Cross-Origin Resource Sharing)                    │  │
│  │  3. Body Parser (JSON parsing)                              │  │
│  │  4. Authenticate (session validation)                       │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │                    ROUTER LAYER                             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  /health           → Health Check                           │  │
│  │  /auth/*           → Authentication Routes                  │  │
│  │  /trips/*          → Trip Management (+ requireAuth)        │  │
│  │  /travelers/*      → Traveler Management                    │  │
│  │  /bookings/*       → Booking Management                     │  │
│  │  /payments/*       → Payment Management                     │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │              MIDDLEWARE LAYER                               │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • Request Validation (Zod schemas)                         │  │
│  │  • Authorization Checks (requireAuth, requireOwner)         │  │
│  │  • Business Logic Orchestration                             │  │
│  │  • Error Handling (ctx.throw)                               │  │
│  │  • Response Formatting (ctx.body)                           │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │                    UTILITY LAYER                            │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • params.ts        (parseId, parseQueryInt)                │  │
│  │  • validation.ts    (validateBody, validateHasFields)       │  │
│  │  • resources.ts     (requireResource, handleUnique)         │  │
│  │  • auth.ts          (requireUser, requireTripOwnership)     │  │
│  │  • crypto.ts        (hashPassword, comparePassword)         │  │
│  │  • transaction.ts   (withTransaction)                       │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │                     MODEL LAYER                             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • tripModel.ts              (CRUD + createWithOwner)       │  │
│  │  • bookingModel.ts           (CRUD + cancelWithRefund)      │  │
│  │  • paymentModel.ts           (CRUD)                         │  │
│  │  • travelerModel.ts          (CRUD)                         │  │
│  │  • userModel.ts              (CRUD + findByEmail)           │  │
│  │  • sessionModel.ts           (CRUD + expiry checks)         │  │
│  │  • organizationModel.ts      (CRUD)                         │  │
│  │  • tripPermissionModel.ts    (access checks)                │  │
│  │  • organizationTripShareModel.ts (sharing)                  │  │
│  │  • userTripShareModel.ts     (sharing)                      │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                       │
│  ┌─────────────────────────▼───────────────────────────────────┐  │
│  │                DATABASE CONNECTION                          │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • db.ts - PostgreSQL Connection Pool                      │  │
│  │  • executeQuery() - Query wrapper                           │  │
│  │  • pool.connect() - Get client for transactions            │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ TCP Connection
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    11 TABLES                                │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  • organizations         (2 records seeded)                 │  │
│  │  • users                 (3 records seeded)                 │  │
│  │  • sessions              (session storage)                  │  │
│  │  • trips                 (4 records seeded)                 │  │
│  │  • trip_permissions      (ownership tracking)               │  │
│  │  • organization_trip_shares (org-level sharing)             │  │
│  │  • user_trip_shares      (user-level sharing)               │  │
│  │  • bookings              (3 records seeded)                 │  │
│  │  • payments              (3 records seeded)                 │  │
│  │  • travelers             (3 records seeded)                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Features:                                                          │
│  • ACID Transactions                                                │
│  • Foreign Key Constraints                                          │
│  • Indexes on Foreign Keys                                          │
│  • ON CONFLICT DO UPDATE (Upsert)                                   │
│  • CASCADE Deletes                                                  │
└─────────────────────────────────────────────────────────────────────┘

DATA FLOW EXAMPLE: Cancel Booking
──────────────────────────────────

Client Request:
  PATCH /bookings/1/cancel

  ↓

Router:
  Match route → bookingsRouter.patch('/:id/cancel', cancelBooking)

  ↓

Middleware (cancelBooking):
  1. parseId(ctx) → id = 1
  2. requireResource() → fetch booking, verify exists
  3. Check if already cancelled
  4. Call BookingModel.cancelWithRefund(1)

  ↓

Model (BookingModel):
  withTransaction(async (client) => {
    1. UPDATE bookings SET status='cancelled' WHERE id=1
    2. SELECT latest completed payment for booking 1
    3. INSERT refund payment (negative amount)
    COMMIT (or ROLLBACK on error)
  })

  ↓

Database:
  Execute queries within transaction
  Return updated booking + refund

  ↓

Middleware:
  Format response → ctx.body = { booking, refund }

  ↓

Client Response:
  200 OK
  {
    "booking": { "id": 1, "status": "cancelled", ... },
    "refund": { "id": 4, "amount": -500.00, ... }
  }
```

---

## Trade-offs and Limitations

### 1. Transaction Overhead

**Trade-off:** Data integrity vs. Performance

**Decision:** Use transactions for multi-step operations

**Benefits:**
- ✅ Guaranteed data consistency
- ✅ Automatic rollback on errors
- ✅ No partial failures

**Costs:**
- ⚠️ Holds database connection longer
- ⚠️ Slightly slower than non-transactional
- ⚠️ More complex code

**Mitigation:**
- Keep transactions short
- Only use for operations that truly need atomicity
- Connection pooling to manage resources

**Acceptable because:** Data integrity is more important than microseconds

---

### 2. Session-Based Authentication

**Trade-off:** Simplicity vs. Scalability

**Decision:** Database-backed sessions instead of JWT

**Benefits:**
- ✅ Easy session revocation
- ✅ Small cookie size
- ✅ Persistent across restarts
- ✅ Audit trail

**Costs:**
- ⚠️ Database query on every authenticated request
- ⚠️ Harder to scale horizontally (need session replication)
- ⚠️ Not stateless

**Mitigation:**
- Index on session_id for fast lookups
- Could add Redis cache in future
- Session expiry cleanup job

**Acceptable because:** Project scale doesn't require JWT complexity

---

### 3. N+1 Query Problem in Permission Checks

**Trade-off:** Code clarity vs. Query efficiency

**Current Implementation:**
```typescript
export async function getTrips(ctx: Context) {
  const trips = await TripModel.findAll()  // 1 query
  
  for (const trip of trips) {
    const canAccess = await userCanAccessTrip(trip.id, user.id)  // N queries
    if (canAccess) {
      accessibleTrips.push(trip)
    }
  }
}
```

**Problem:** 1 + N queries (N = number of trips)

**Benefits:**
- ✅ Clear, readable code
- ✅ Reuses permission checking logic
- ✅ Easy to understand and maintain

**Costs:**
- ⚠️ Many database queries
- ⚠️ Slower for large datasets

**Better Alternative (not implemented):**
```sql
SELECT t.* FROM trips t
LEFT JOIN trip_permissions tp ON t.id = tp.trip_id AND tp.user_id = $1
LEFT JOIN organization_trip_shares ots ON t.id = ots.trip_id AND ots.organization_id = (
  SELECT organization_id FROM users WHERE id = $1
)
LEFT JOIN user_trip_shares uts ON t.id = uts.trip_id AND uts.user_id = $1
WHERE tp.user_id IS NOT NULL OR ots.trip_id IS NOT NULL OR uts.trip_id IS NOT NULL
```

**Why not implemented:**
- Current approach works fine for expected dataset size (< 1000 trips)
- Premature optimization
- More complex SQL harder to maintain

**Acceptable because:** Simplicity > Performance for this use case

---

### 4. Password Hashing Algorithm

**Trade-off:** Built-in vs. Industry standard

**Decision:** Use Node.js crypto `scrypt` instead of bcrypt

**Benefits:**
- ✅ No external dependencies
- ✅ No native compilation
- ✅ Good security (PBKDF2-like)
- ✅ Configurable iterations

**Costs:**
- ⚠️ Not as widely used as bcrypt
- ⚠️ Less battle-tested
- ⚠️ May need migration to bcrypt in future

**Acceptable because:** 
- Good enough security for challenge
- Avoids compilation issues
- Can migrate to bcrypt later if needed

---

### 5. No Pagination

**Trade-off:** Simplicity vs. Scalability

**Current Implementation:** Return all results

**Benefits:**
- ✅ Simple API
- ✅ No page tracking needed
- ✅ Easy to use

**Costs:**
- ⚠️ Can't handle large datasets
- ⚠️ Memory usage grows with data
- ⚠️ Slow response times for many records

**Better Alternative:**
```typescript
GET /trips?page=1&limit=20
```

**Why not implemented:**
- Not required for challenge
- Current dataset is small
- Easy to add later

**Acceptable because:** Challenge scope doesn't require it

---

### 6. No Rate Limiting

**Trade-off:** Security vs. Complexity

**Decision:** No rate limiting implemented

**Benefits:**
- ✅ Simpler code
- ✅ No additional infrastructure

**Costs:**
- ⚠️ Vulnerable to brute force attacks
- ⚠️ No DoS protection
- ⚠️ Resource exhaustion possible

**Better Alternative:**
```typescript
import rateLimit from 'koa-ratelimit'

app.use(rateLimit({
  driver: 'memory',
  db: new Map(),
  duration: 60000, // 1 minute
  max: 100,
}))
```

**Why not implemented:**
- Not required for challenge
- Development environment
- Would add in production

**Not acceptable for production:** Should be added before deployment

---

### 7. Environment Variables

**Trade-off:** Security vs. Convenience

**Decision:** Use `.env` file with gitignore

**Benefits:**
- ✅ Secrets not in code
- ✅ Easy to configure per environment
- ✅ Standard practice

**Costs:**
- ⚠️ Manual setup required
- ⚠️ Risk of committing `.env` by mistake
- ⚠️ Not suitable for large teams

**Better Alternative (production):**
- Azure Key Vault
- AWS Secrets Manager
- Kubernetes Secrets

**Acceptable because:** Standard for development, documented for production

---

### 8. Error Messages Verbosity

**Trade-off:** Developer experience vs. Security

**Decision:** Detailed error messages in responses

**Benefits:**
- ✅ Easy debugging
- ✅ Clear API errors
- ✅ Good developer experience

**Costs:**
- ⚠️ May leak implementation details
- ⚠️ Security risk in production

**Example:**
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email format"],
    "password": ["String must contain at least 8 characters"]
  }
}
```

**Production consideration:** Generic errors for authentication failures

**Acceptable because:** Development environment, helpful for testing

---

### 9. No Input Sanitization

**Trade-off:** Security vs. Database protection

**Decision:** Rely on parameterized queries

**Benefits:**
- ✅ SQL injection prevention via parameterized queries
- ✅ Simpler code
- ✅ Database handles escaping

**Costs:**
- ⚠️ No XSS protection
- ⚠️ Stores user input as-is

**Better Alternative:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

const clean = DOMPurify.sanitize(userInput)
```

**Why not implemented:**
- API doesn't render HTML
- Client responsible for output encoding
- Parameterized queries prevent SQL injection

**Acceptable because:** API-only, no HTML rendering

---

### 10. Single Database Connection Pool

**Trade-off:** Simplicity vs. Read scalability

**Decision:** Single connection pool for all operations

**Benefits:**
- ✅ Simple configuration
- ✅ Easy to understand
- ✅ Sufficient for expected load

**Costs:**
- ⚠️ Reads and writes compete for connections
- ⚠️ Can't scale reads independently

**Better Alternative (large scale):**
- Read replicas
- Separate read/write pools
- Connection pooling per operation type

**Acceptable because:** Expected load is low, can scale later

---

## Test Coverage Summary

### Total: 95 Tests across 4 Suites

**Exercise 1: Booking Cancellation** - 23 tests
- ✅ Basic cancellation with refund
- ✅ Error cases (already cancelled, not found)
- ✅ Edge cases (no payments, pending payments, multiple payments)
- ✅ Data integrity (amounts, currency, status)
- ✅ Idempotency (double refund prevention)

**Exercise 2: Authentication & Authorization** - 23 tests
- ✅ User registration (success, duplicates, validation)
- ✅ Login (credentials, sessions, errors)
- ✅ Session management (current user, logout, expiry)
- ✅ Trip authorization (ownership, privacy, access control)
- ✅ Security (password not in responses, concurrent sessions)

**Exercise 3: Organization Sharing** - 21 tests
- ✅ Share with organization (read, write permissions)
- ✅ Permission enforcement (view, edit, delete restrictions)
- ✅ Organization member access
- ✅ Unshare functionality
- ✅ Cross-organization isolation
- ✅ Edge cases (invalid permissions, updates, non-existent trips)

**Bonus: User-Specific Sharing** - 26 tests
- ✅ Cross-organization sharing
- ✅ User-specific permissions
- ✅ Permission hierarchy (individual > organization)
- ✅ Share restrictions (cannot share with self, non-owner)
- ✅ Permission updates via re-sharing
- ✅ Edge cases (invalid IDs, multiple users, separated permissions)

---

## Conclusion

This project demonstrates:
- **Solid architectural patterns** (layered architecture, separation of concerns)
- **Data integrity** (ACID transactions, foreign key constraints)
- **Security best practices** (password hashing, session management, authorization)
- **Code quality** (DRY utilities, type safety, comprehensive tests)
- **Thoughtful trade-offs** (simplicity vs. scalability, security vs. usability)

**Production readiness:**
- ✅ Transaction safety
- ✅ Authentication/authorization
- ✅ Environment variables
- ✅ Comprehensive testing
- ⚠️ Would add: rate limiting, pagination, monitoring, logging
- ⚠️ Would improve: N+1 queries, error messages (production mode)

The implementation prioritizes **correctness**, **maintainability**, and **clarity** while acknowledging trade-offs made for project scope and timeline.

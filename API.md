# API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints Reference](#endpoints-reference)
4. [Error Handling](#error-handling)
5. [Use Cases & Examples](#use-cases--examples)

---

## Overview

### Base URL
```
http://localhost:3000
```

### Authentication
- **Type:** Session-based (cookies)
- **Cookie Name:** `session_id`
- **Cookie Attributes:** HTTP-only, Secure (production), SameSite=Lax

### Content Type
All requests and responses use `application/json` unless otherwise specified.

### Common Response Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource

---

## Authentication

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Authorization:** None

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": 1
}
```

**Validation:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters
- `firstName`: Non-empty string
- `lastName`: Non-empty string
- `organizationId`: Must reference existing organization

**Response:** `201 Created`
```json
{
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organizationId": 1,
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input (email format, password too short, missing fields)
- `409` - Email already exists

---

### Login

Authenticate and create a session.

**Endpoint:** `POST /auth/login`

**Authorization:** None

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organizationId": 1,
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Response Headers:**
```
Set-Cookie: session_id=abc123...; Path=/; HttpOnly; SameSite=Lax
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials

**Notes:**
- Session expires after configured duration (default: 7 days)
- Session ID is stored in HTTP-only cookie

---

### Get Current User

Get authenticated user details.

**Endpoint:** `GET /auth/me`

**Authorization:** Required (session cookie)

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organizationId": 1,
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Not authenticated (no session or expired)

---

### Logout

Destroy current session.

**Endpoint:** `POST /auth/logout`

**Authorization:** Required (session cookie)

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

**Response Headers:**
```
Set-Cookie: session_id=; Path=/; Max-Age=0
```

**Errors:**
- `401` - Not authenticated

---

## Endpoints Reference

### Trips

#### List All Trips

Get all trips accessible by the authenticated user (owned, shared with user, or shared with organization).

**Endpoint:** `GET /trips`

**Authorization:** Required

**Query Parameters:** None

**Response:** `200 OK`
```json
{
  "trips": [
    {
      "id": 1,
      "title": "Summer Vacation 2025",
      "destination": "Barcelona",
      "startDate": "2025-07-01",
      "endDate": "2025-07-15",
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Business Trip",
      "destination": "London",
      "startDate": "2025-08-10",
      "endDate": "2025-08-12",
      "createdAt": "2025-02-01T14:30:00.000Z"
    }
  ]
}
```

**Access Rules:**
- Shows trips where user is owner
- Shows trips shared with user individually
- Shows trips shared with user's organization

---

#### Get Trip by ID

Get details of a specific trip.

**Endpoint:** `GET /trips/:id`

**Authorization:** Required

**Path Parameters:**
- `id` (integer) - Trip ID

**Response:** `200 OK`
```json
{
  "trip": {
    "id": 1,
    "title": "Summer Vacation 2025",
    "destination": "Barcelona",
    "startDate": "2025-07-01",
    "endDate": "2025-07-15",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Not authenticated
- `403` - User doesn't have access to this trip
- `404` - Trip not found

---

#### Create Trip

Create a new trip. User automatically becomes the owner.

**Endpoint:** `POST /trips`

**Authorization:** Required

**Request Body:**
```json
{
  "title": "Summer Vacation 2025",
  "destination": "Barcelona",
  "startDate": "2025-07-01",
  "endDate": "2025-07-15"
}
```

**Validation:**
- `title`: Non-empty string, max 255 characters
- `destination`: Non-empty string, max 255 characters
- `startDate`: Valid date in YYYY-MM-DD format
- `endDate`: Valid date in YYYY-MM-DD format, must be >= startDate

**Response:** `201 Created`
```json
{
  "trip": {
    "id": 1,
    "title": "Summer Vacation 2025",
    "destination": "Barcelona",
    "startDate": "2025-07-01",
    "endDate": "2025-07-15",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input (missing fields, invalid dates, end date before start date)
- `401` - Not authenticated

**Notes:**
- Creates trip and assigns owner permission in single transaction
- Trip is private by default (only visible to owner)

---

#### Update Trip

Update an existing trip.

**Endpoint:** `PATCH /trips/:id`

**Authorization:** Required (must be owner or have write permission)

**Path Parameters:**
- `id` (integer) - Trip ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "destination": "New Destination",
  "startDate": "2025-07-05",
  "endDate": "2025-07-20"
}
```

**Notes:** All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`
```json
{
  "trip": {
    "id": 1,
    "title": "Updated Title",
    "destination": "New Destination",
    "startDate": "2025-07-05",
    "endDate": "2025-07-20",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input
- `401` - Not authenticated
- `403` - User doesn't have write permission
- `404` - Trip not found

**Permission Requirements:**
- Owner: ✅ Can update
- Write permission: ✅ Can update
- Read permission: ❌ Cannot update

---

#### Delete Trip

Delete an existing trip.

**Endpoint:** `DELETE /trips/:id`

**Authorization:** Required (must be owner)

**Path Parameters:**
- `id` (integer) - Trip ID

**Response:** `200 OK`
```json
{
  "message": "Trip deleted successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - User is not the owner
- `404` - Trip not found

**Permission Requirements:**
- Owner: ✅ Can delete
- Write permission: ❌ Cannot delete
- Read permission: ❌ Cannot delete

**Notes:**
- Only the owner can delete a trip
- Cascading delete removes all bookings, permissions, and shares

---

### Trip Sharing

#### Share Trip with Organization

Share a trip with all members of the owner's organization.

**Endpoint:** `POST /trips/:id/share/organization`

**Authorization:** Required (must be owner)

**Path Parameters:**
- `id` (integer) - Trip ID

**Request Body:**
```json
{
  "permissionLevel": "read"
}
```

**Validation:**
- `permissionLevel`: Must be `"read"` or `"write"`

**Response:** `200 OK`
```json
{
  "message": "Trip shared with organization successfully",
  "share": {
    "tripId": 1,
    "organizationId": 1,
    "permissionLevel": "read",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid permission level
- `401` - Not authenticated
- `403` - User is not the owner
- `404` - Trip not found

**Permission Levels:**
- `read`: Can view trip details
- `write`: Can view and update trip (but not delete)

**Notes:**
- All members of the owner's organization get access
- Re-sharing with different permission level updates existing share
- Idempotent operation (can call multiple times)

---

#### Unshare Trip from Organization

Remove organization-wide access to a trip.

**Endpoint:** `DELETE /trips/:id/share/organization`

**Authorization:** Required (must be owner)

**Path Parameters:**
- `id` (integer) - Trip ID

**Response:** `200 OK`
```json
{
  "message": "Trip unshared from organization successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - User is not the owner
- `404` - Trip not found or not shared with organization

---

#### Share Trip with User

Share a trip with a specific user (can be from any organization).

**Endpoint:** `POST /trips/:id/share/users/:userId`

**Authorization:** Required (must be owner)

**Path Parameters:**
- `id` (integer) - Trip ID
- `userId` (integer) - User ID to share with

**Request Body:**
```json
{
  "permissionLevel": "write"
}
```

**Validation:**
- `permissionLevel`: Must be `"read"` or `"write"`

**Response:** `200 OK`
```json
{
  "message": "Trip shared with user successfully",
  "share": {
    "tripId": 1,
    "userId": 5,
    "permissionLevel": "write",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid permission level or trying to share with yourself
- `401` - Not authenticated
- `403` - User is not the owner
- `404` - Trip or target user not found

**Permission Levels:**
- `read`: Can view trip details
- `write`: Can view and update trip (but not delete)

**Notes:**
- Can share with users from any organization
- User-specific permissions override organization permissions
- Cannot share with yourself
- Re-sharing updates permission level

---

#### Unshare Trip from User

Remove a specific user's access to a trip.

**Endpoint:** `DELETE /trips/:id/share/users/:userId`

**Authorization:** Required (must be owner)

**Path Parameters:**
- `id` (integer) - Trip ID
- `userId` (integer) - User ID to unshare from

**Response:** `200 OK`
```json
{
  "message": "Trip unshared from user successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - User is not the owner
- `404` - Trip not found or not shared with user

---

### Travelers

#### List All Travelers

Get all travelers.

**Endpoint:** `GET /travelers`

**Authorization:** None (public endpoint)

**Response:** `200 OK`
```json
{
  "travelers": [
    {
      "id": 1,
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@example.com",
      "createdAt": "2025-01-10T08:00:00.000Z"
    },
    {
      "id": 2,
      "firstName": "Bob",
      "lastName": "Johnson",
      "email": "bob.johnson@example.com",
      "createdAt": "2025-01-12T09:30:00.000Z"
    }
  ]
}
```

---

#### Get Traveler by ID

Get details of a specific traveler.

**Endpoint:** `GET /travelers/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Traveler ID

**Response:** `200 OK`
```json
{
  "traveler": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "createdAt": "2025-01-10T08:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Traveler not found

---

#### Create Traveler

Create a new traveler.

**Endpoint:** `POST /travelers`

**Authorization:** None (public endpoint)

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.smith@example.com"
}
```

**Validation:**
- `firstName`: Non-empty string, max 100 characters
- `lastName`: Non-empty string, max 100 characters
- `email`: Valid email format, unique, max 255 characters

**Response:** `201 Created`
```json
{
  "traveler": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input (missing fields, invalid email format)
- `409` - Email already exists

---

#### Update Traveler

Update an existing traveler.

**Endpoint:** `PATCH /travelers/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Traveler ID

**Request Body:**
```json
{
  "firstName": "Alice Updated",
  "email": "alice.new@example.com"
}
```

**Notes:** All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`
```json
{
  "traveler": {
    "id": 1,
    "firstName": "Alice Updated",
    "lastName": "Smith",
    "email": "alice.new@example.com",
    "createdAt": "2025-01-10T08:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input
- `404` - Traveler not found
- `409` - Email already exists

---

#### Delete Traveler

Delete an existing traveler.

**Endpoint:** `DELETE /travelers/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Traveler ID

**Response:** `200 OK`
```json
{
  "message": "Traveler deleted successfully"
}
```

**Errors:**
- `404` - Traveler not found

---

### Bookings

#### List All Bookings

Get all bookings.

**Endpoint:** `GET /bookings`

**Authorization:** None (public endpoint)

**Query Parameters:**
- `tripId` (optional, integer) - Filter by trip
- `travelerId` (optional, integer) - Filter by traveler

**Response:** `200 OK`
```json
{
  "bookings": [
    {
      "id": 1,
      "tripId": 1,
      "travelerId": 1,
      "status": "confirmed",
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "tripId": 1,
      "travelerId": 2,
      "status": "pending",
      "createdAt": "2025-01-16T11:00:00.000Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Booking created but not confirmed
- `confirmed` - Booking confirmed
- `cancelled` - Booking cancelled

**Examples:**
```
GET /bookings
GET /bookings?tripId=1
GET /bookings?travelerId=2
GET /bookings?tripId=1&travelerId=2
```

---

#### Get Booking by ID

Get details of a specific booking.

**Endpoint:** `GET /bookings/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Booking ID

**Response:** `200 OK`
```json
{
  "booking": {
    "id": 1,
    "tripId": 1,
    "travelerId": 1,
    "status": "confirmed",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Booking not found

---

#### Create Booking

Create a new booking.

**Endpoint:** `POST /bookings`

**Authorization:** None (public endpoint)

**Request Body:**
```json
{
  "tripId": 1,
  "travelerId": 1,
  "status": "pending"
}
```

**Validation:**
- `tripId`: Must reference existing trip
- `travelerId`: Must reference existing traveler
- `status`: Must be `"pending"`, `"confirmed"`, or `"cancelled"` (default: `"pending"`)

**Response:** `201 Created`
```json
{
  "booking": {
    "id": 1,
    "tripId": 1,
    "travelerId": 1,
    "status": "pending",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input (missing fields, invalid status)
- `404` - Trip or traveler not found

---

#### Update Booking

Update an existing booking.

**Endpoint:** `PATCH /bookings/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Booking ID

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Notes:** All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`
```json
{
  "booking": {
    "id": 1,
    "tripId": 1,
    "travelerId": 1,
    "status": "confirmed",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input
- `404` - Booking not found

---

#### Cancel Booking

Cancel a booking and create automatic refund if payment exists.

**Endpoint:** `PATCH /bookings/:id/cancel`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Booking ID

**Response:** `200 OK`

**With refund:**
```json
{
  "booking": {
    "id": 1,
    "tripId": 1,
    "travelerId": 1,
    "status": "cancelled",
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  "refund": {
    "id": 4,
    "bookingId": 1,
    "amount": "-500.00",
    "currency": "EUR",
    "status": "refunded",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Without refund (no completed payment):**
```json
{
  "booking": {
    "id": 1,
    "tripId": 1,
    "travelerId": 1,
    "status": "cancelled",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Booking is already cancelled
- `404` - Booking not found

**Business Logic:**
- Sets booking status to `cancelled`
- If a completed payment exists:
  - Creates a refund payment with negative amount
  - Refund status is `refunded`
  - Original payment remains `completed` (audit trail)
  - Uses latest completed payment if multiple exist
- If no completed payment exists:
  - Only cancels the booking
  - No refund created
- **Atomic operation:** Both booking update and refund creation succeed or both fail

**Important:** This is an idempotent operation at the booking level (can't cancel twice), but creates a new refund each time if called before fix.

---

#### Delete Booking

Delete an existing booking.

**Endpoint:** `DELETE /bookings/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Booking ID

**Response:** `200 OK`
```json
{
  "message": "Booking deleted successfully"
}
```

**Errors:**
- `404` - Booking not found

---

### Payments

#### List All Payments

Get all payments.

**Endpoint:** `GET /payments`

**Authorization:** None (public endpoint)

**Query Parameters:**
- `bookingId` (optional, integer) - Filter by booking

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": 1,
      "bookingId": 1,
      "amount": "500.00",
      "currency": "EUR",
      "status": "completed",
      "createdAt": "2025-01-20T14:00:00.000Z"
    },
    {
      "id": 2,
      "bookingId": 2,
      "amount": "750.50",
      "currency": "USD",
      "status": "pending",
      "createdAt": "2025-01-21T15:30:00.000Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Payment initiated but not completed
- `completed` - Payment successful
- `refunded` - Payment refunded (negative amount)
- `failed` - Payment failed

**Examples:**
```
GET /payments
GET /payments?bookingId=1
```

---

#### Get Payment by ID

Get details of a specific payment.

**Endpoint:** `GET /payments/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Payment ID

**Response:** `200 OK`
```json
{
  "payment": {
    "id": 1,
    "bookingId": 1,
    "amount": "500.00",
    "currency": "EUR",
    "status": "completed",
    "createdAt": "2025-01-20T14:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Payment not found

---

#### Create Payment

Create a new payment.

**Endpoint:** `POST /payments`

**Authorization:** None (public endpoint)

**Request Body:**
```json
{
  "bookingId": 1,
  "amount": 500.00,
  "currency": "EUR",
  "status": "pending"
}
```

**Validation:**
- `bookingId`: Must reference existing booking
- `amount`: Positive or negative number with up to 2 decimal places
- `currency`: 3-letter currency code (default: `"EUR"`)
- `status`: Must be `"pending"`, `"completed"`, `"refunded"`, or `"failed"` (default: `"pending"`)

**Response:** `201 Created`
```json
{
  "payment": {
    "id": 1,
    "bookingId": 1,
    "amount": "500.00",
    "currency": "EUR",
    "status": "pending",
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input (missing fields, invalid amount, invalid currency)
- `404` - Booking not found

**Notes:**
- Refunds should have negative amounts
- Use booking cancellation endpoint for automatic refunds

---

#### Update Payment

Update an existing payment.

**Endpoint:** `PATCH /payments/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Payment ID

**Request Body:**
```json
{
  "status": "completed"
}
```

**Notes:** All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`
```json
{
  "payment": {
    "id": 1,
    "bookingId": 1,
    "amount": "500.00",
    "currency": "EUR",
    "status": "completed",
    "createdAt": "2025-01-20T14:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid input
- `404` - Payment not found

---

#### Delete Payment

Delete an existing payment.

**Endpoint:** `DELETE /payments/:id`

**Authorization:** None (public endpoint)

**Path Parameters:**
- `id` (integer) - Payment ID

**Response:** `200 OK`
```json
{
  "message": "Payment deleted successfully"
}
```

**Errors:**
- `404` - Payment not found

---

## Error Handling

### Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Error message here"
}
```

### Validation Errors

When request validation fails, the response includes detailed field-level errors:

```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Invalid email"],
    "password": ["String must contain at least 8 character(s)"]
  }
}
```

### Common Error Scenarios

#### 400 Bad Request
```json
{
  "error": "Invalid input: end_date must be after start_date"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "You do not have permission to access this trip"
}
```

#### 404 Not Found
```json
{
  "error": "Trip not found"
}
```

#### 409 Conflict
```json
{
  "error": "Unique constraint failed on email"
}
```

---

## Use Cases & Examples

### Use Case 1: User Registration and First Trip

**Step 1: Register a new user**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!",
    "firstName": "Sarah",
    "lastName": "Connor",
    "organizationId": 1
  }'
```

Response:
```json
{
  "user": {
    "id": 4,
    "email": "sarah@example.com",
    "firstName": "Sarah",
    "lastName": "Connor",
    "organizationId": 1,
    "createdAt": "2025-12-29T10:00:00.000Z"
  }
}
```

**Step 2: Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "sarah@example.com",
    "password": "SecurePass123!"
  }'
```

Response sets `session_id` cookie.

**Step 3: Create a trip**

```bash
curl -X POST http://localhost:3000/trips \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Hawaii Vacation",
    "destination": "Honolulu",
    "startDate": "2025-12-15",
    "endDate": "2025-12-25"
  }'
```

Response:
```json
{
  "trip": {
    "id": 5,
    "title": "Hawaii Vacation",
    "destination": "Honolulu",
    "startDate": "2025-12-15",
    "endDate": "2025-12-25",
    "createdAt": "2025-12-29T10:05:00.000Z"
  }
}
```

---

### Use Case 2: Share Trip with Organization

**Step 1: Create a trip (as owner)**

```bash
curl -X POST http://localhost:3000/trips \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Team Building Event",
    "destination": "Amsterdam",
    "startDate": "2025-09-01",
    "endDate": "2025-09-03"
  }'
```

**Step 2: Share with organization (read-only)**

```bash
curl -X POST http://localhost:3000/trips/5/share/organization \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "permissionLevel": "read"
  }'
```

Response:
```json
{
  "message": "Trip shared with organization successfully",
  "share": {
    "tripId": 5,
    "organizationId": 1,
    "permissionLevel": "read",
    "createdAt": "2025-12-29T10:10:00.000Z"
  }
}
```

**Step 3: Update to write permission**

```bash
curl -X POST http://localhost:3000/trips/5/share/organization \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "permissionLevel": "write"
  }'
```

Now all organization members can view and edit the trip.

---

### Use Case 3: Cross-Organization Sharing

**Step 1: Share trip with specific user from another organization**

```bash
curl -X POST http://localhost:3000/trips/5/share/users/7 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "permissionLevel": "write"
  }'
```

Response:
```json
{
  "message": "Trip shared with user successfully",
  "share": {
    "tripId": 5,
    "userId": 7,
    "permissionLevel": "write",
    "createdAt": "2025-12-29T10:15:00.000Z"
  }
}
```

**Step 2: User from another org can now access the trip**

```bash
# Login as the other user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies-user7.txt \
  -d '{
    "email": "user7@company2.com",
    "password": "password123"
  }'

# Access shared trip
curl -X GET http://localhost:3000/trips/5 \
  -b cookies-user7.txt
```

---

### Use Case 4: Booking with Payment and Cancellation

**Step 1: Create a traveler**

```bash
curl -X POST http://localhost:3000/travelers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Michael",
    "lastName": "Scott",
    "email": "michael.scott@example.com"
  }'
```

**Step 2: Create a booking**

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": 1,
    "travelerId": 5,
    "status": "pending"
  }'
```

Response:
```json
{
  "booking": {
    "id": 10,
    "tripId": 1,
    "travelerId": 5,
    "status": "pending",
    "createdAt": "2025-12-29T10:20:00.000Z"
  }
}
```

**Step 3: Create a payment**

```bash
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 10,
    "amount": 1200.00,
    "currency": "EUR",
    "status": "completed"
  }'
```

**Step 4: Cancel booking (automatic refund)**

```bash
curl -X PATCH http://localhost:3000/bookings/10/cancel
```

Response:
```json
{
  "booking": {
    "id": 10,
    "tripId": 1,
    "travelerId": 5,
    "status": "cancelled",
    "createdAt": "2025-12-29T10:20:00.000Z"
  },
  "refund": {
    "id": 11,
    "bookingId": 10,
    "amount": "-1200.00",
    "currency": "EUR",
    "status": "refunded",
    "createdAt": "2025-12-29T10:25:00.000Z"
  }
}
```

**Step 5: Verify payments**

```bash
curl -X GET http://localhost:3000/payments?bookingId=10
```

Response shows both original payment and refund:
```json
{
  "payments": [
    {
      "id": 10,
      "bookingId": 10,
      "amount": "1200.00",
      "currency": "EUR",
      "status": "completed",
      "createdAt": "2025-12-29T10:22:00.000Z"
    },
    {
      "id": 11,
      "bookingId": 10,
      "amount": "-1200.00",
      "currency": "EUR",
      "status": "refunded",
      "createdAt": "2025-12-29T10:25:00.000Z"
    }
  ]
}
```

---

### Use Case 5: Permission Hierarchy

**Scenario:** User has organization read access but individual write access.

**Setup:**
```bash
# Trip owner shares with organization (read)
curl -X POST http://localhost:3000/trips/1/share/organization \
  -b cookies-owner.txt \
  -H "Content-Type: application/json" \
  -d '{"permissionLevel": "read"}'

# Trip owner shares with specific user (write)
curl -X POST http://localhost:3000/trips/1/share/users/3 \
  -b cookies-owner.txt \
  -H "Content-Type: application/json" \
  -d '{"permissionLevel": "write"}'
```

**Result:**
- User 3 can view the trip (from organization share)
- User 3 can edit the trip (from individual write permission)
- Individual permission overrides organization permission
- Other organization members can only view (read permission)

---

### Use Case 6: Session Management

**Check current session:**

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

**Logout:**

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

**Verify logout:**

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

Response:
```json
{
  "error": "Authentication required"
}
```

---

## JavaScript/TypeScript Client Example

### Authentication Helper

```typescript
class APIClient {
  private baseURL = 'http://localhost:3000'
  private sessionCookie: string | null = null

  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationId: number
  }) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: Include cookies
      body: JSON.stringify({ email, password }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    // Browser automatically handles session cookie
    return response.json()
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      if (response.status === 401) return null
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async logout() {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async getTrips() {
    const response = await fetch(`${this.baseURL}/trips`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async createTrip(data: {
    title: string
    destination: string
    startDate: string
    endDate: string
  }) {
    const response = await fetch(`${this.baseURL}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async shareWithOrganization(tripId: number, permissionLevel: 'read' | 'write') {
    const response = await fetch(
      `${this.baseURL}/trips/${tripId}/share/organization`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissionLevel }),
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }

  async shareWithUser(
    tripId: number,
    userId: number,
    permissionLevel: 'read' | 'write'
  ) {
    const response = await fetch(
      `${this.baseURL}/trips/${tripId}/share/users/${userId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissionLevel }),
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    return response.json()
  }
}

// Usage
const api = new APIClient()

// Register and login
await api.register({
  email: 'john@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  organizationId: 1,
})

await api.login('john@example.com', 'SecurePass123!')

// Create trip
const { trip } = await api.createTrip({
  title: 'Summer Vacation',
  destination: 'Barcelona',
  startDate: '2025-07-01',
  endDate: '2025-07-15',
})

// Share with organization
await api.shareWithOrganization(trip.id, 'read')

// Get current user
const { user } = await api.getCurrentUser()
console.log(user)
```

---

## React Example: Protected Routes

```typescript
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  organizationId: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    fetch('http://localhost:3000/auth/me', {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    const data = await response.json()
    setUser(data.user)
  }

  const logout = async () => {
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
  }

  const register = async (data: RegisterData) => {
    const response = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    // Auto-login after registration
    await login(data.email, data.password)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

// Protected route component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}
```

---

## Important Notes for Frontend Developers

### 1. Cookie-Based Authentication

- **Always include `credentials: 'include'`** in fetch requests
- Browser automatically handles session cookie storage
- No need to manually manage tokens
- Logout clears the cookie

### 2. Error Handling

- Check `response.ok` before parsing JSON
- All errors have `error` field in response body
- Validation errors include `details` object
- Handle 401 by redirecting to login

### 3. Date Handling

- Dates are in `YYYY-MM-DD` format
- Timestamps are ISO 8601 format with timezone
- Always validate date ranges (end >= start)

### 4. Permission Model

**Permission Hierarchy (highest to lowest):**
1. Owner (can do everything)
2. Individual user share (write > read)
3. Organization share (write > read)

**Capabilities:**
- **Owner:** View, edit, delete, share, unshare
- **Write:** View, edit (no delete, no sharing)
- **Read:** View only

### 5. Data Relationships

- **Trip** ↔ **Bookings** (one-to-many)
- **Booking** ↔ **Payments** (one-to-many)
- **Trip** ↔ **Shares** (organization or user-specific)
- **User** ↔ **Organization** (many-to-one)

### 6. Idempotency

- Sharing operations are idempotent (can call multiple times)
- Cancellation is idempotent at booking level
- Updates are idempotent

### 7. CORS

If frontend runs on different port:
- Ensure CORS is configured on backend
- Use `credentials: 'include'` for cookies
- Check allowed origins

---

## Postman Collection

Import the following JSON into Postman:

```json
{
  "info": {
    "name": "Trip Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "noauth"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"firstName\": \"Test\",\n  \"lastName\": \"User\",\n  \"organizationId\": 1\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          }
        },
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/auth/me",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "me"]
            }
          }
        },
        {
          "name": "Logout",
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/auth/logout",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "logout"]
            }
          }
        }
      ]
    },
    {
      "name": "Trips",
      "item": [
        {
          "name": "List Trips",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/trips",
              "host": ["{{baseUrl}}"],
              "path": ["trips"]
            }
          }
        },
        {
          "name": "Create Trip",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"Summer Vacation\",\n  \"destination\": \"Barcelona\",\n  \"startDate\": \"2025-07-01\",\n  \"endDate\": \"2025-07-15\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/trips",
              "host": ["{{baseUrl}}"],
              "path": ["trips"]
            }
          }
        },
        {
          "name": "Share with Organization",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"permissionLevel\": \"read\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/trips/:id/share/organization",
              "host": ["{{baseUrl}}"],
              "path": ["trips", ":id", "share", "organization"],
              "variable": [
                {
                  "key": "id",
                  "value": "1"
                }
              ]
            }
          }
        },
        {
          "name": "Share with User",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"permissionLevel\": \"write\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/trips/:id/share/users/:userId",
              "host": ["{{baseUrl}}"],
              "path": ["trips", ":id", "share", "users", ":userId"],
              "variable": [
                {
                  "key": "id",
                  "value": "1"
                },
                {
                  "key": "userId",
                  "value": "2"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Bookings",
      "item": [
        {
          "name": "List Bookings",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/bookings",
              "host": ["{{baseUrl}}"],
              "path": ["bookings"]
            }
          }
        },
        {
          "name": "Cancel Booking",
          "request": {
            "method": "PATCH",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/bookings/:id/cancel",
              "host": ["{{baseUrl}}"],
              "path": ["bookings", ":id", "cancel"],
              "variable": [
                {
                  "key": "id",
                  "value": "1"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    }
  ]
}
```

---

## Summary

This API provides:

✅ **Session-based authentication** with secure cookie handling  
✅ **Flexible permission system** (owner, write, read)  
✅ **Organization and user-level sharing**  
✅ **Atomic operations** (transactions for data integrity)  
✅ **Automatic refund handling** on booking cancellation  
✅ **Comprehensive error handling** with detailed messages  
✅ **Type-safe validation** using Zod schemas  

For any questions or issues, please refer to the code examples and use cases above.

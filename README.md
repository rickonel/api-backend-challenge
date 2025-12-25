# Backend Challenge

A REST API for managing trips, bookings, payments, and travelers. Built with Node.js, Koa.js, PostgreSQL, and Zod for validation.

## Time Limit

**You have a maximum of 3 hours to complete this challenge.**

We value your time. Focus on demonstrating your ability to move fast using AI tools (Claude, Cursor, Copilot, etc.) while maintaining code quality.

### What We're Looking For

We care more about **seeing your progress** than having fully working code. We want to see:

- How you structure your code
- How the pieces fit together
- Code quality and simplicity—the simpler, the better
- How you use AI tools effectively

**Working code is a plus, but not a requirement.** Show us how you think and build.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js v24+ (for local development without Docker)

### Quick Start with Docker

1. Start the environment:

```bash
docker compose up
```

This will:
- Start a PostgreSQL database
- Start the API server on port 3000 with hot reload

2. Run migrations and seeds (in another terminal):

```bash
docker compose exec api npm run db:reset
```

3. Verify the API is running:

```bash
curl http://localhost:3000/health
```

### Local Development (without Docker)

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL (using Docker):

```bash
docker compose up postgres
```

4. Run migrations and seeds:

```bash
npm run db:reset
```

5. Start the development server:

```bash
npm run dev
```

## API Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

### Trips

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips` | List all trips (filter: `?destination=`) |
| GET | `/trips/:id` | Get trip by ID |
| POST | `/trips` | Create trip |
| PUT | `/trips/:id` | Update trip |
| DELETE | `/trips/:id` | Delete trip |

### Travelers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/travelers` | List all travelers (filter: `?email=`) |
| GET | `/travelers/:id` | Get traveler by ID |
| POST | `/travelers` | Create traveler |
| PUT | `/travelers/:id` | Update traveler |
| DELETE | `/travelers/:id` | Delete traveler |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bookings` | List all bookings (filter: `?status=`, `?trip_id=`) |
| GET | `/bookings/:id` | Get booking by ID |
| POST | `/bookings` | Create booking |
| PUT | `/bookings/:id` | Update booking |
| DELETE | `/bookings/:id` | Delete booking |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List all payments (filter: `?status=`, `?booking_id=`) |
| GET | `/payments/:id` | Get payment by ID |
| POST | `/payments` | Create payment |
| PUT | `/payments/:id` | Update payment |
| DELETE | `/payments/:id` | Delete payment |

## Data Models

### Trip

```json
{
  "id": 1,
  "title": "Barcelona Adventure",
  "destination": "Barcelona",
  "start_date": "2025-03-15",
  "end_date": "2025-03-20",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

### Traveler

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

### Booking

```json
{
  "id": 1,
  "trip_id": 1,
  "traveler_id": 1,
  "status": "confirmed",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Status values:** `pending`, `confirmed`, `cancelled`

### Payment

```json
{
  "id": 1,
  "booking_id": 1,
  "amount": 500.00,
  "currency": "EUR",
  "status": "completed",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Status values:** `pending`, `completed`, `refunded`

## Status Lifecycle

Bookings and payments have related statuses that reflect the booking flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOOKING FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐      ┌───────────┐      ┌───────────┐              │
│  │ pending │ ───► │ confirmed │ ───► │ cancelled │              │
│  └─────────┘      └───────────┘      └───────────┘              │
│       │                 │                  │                    │
│       ▼                 ▼                  ▼                    │
│  ┌─────────┐      ┌───────────┐      ┌──────────┐               │
│  │ Payment │      │  Payment  │      │ Payment  │               │
│  │ pending │ ───► │ completed │ ───► │ refunded │               │
│  └─────────┘      └───────────┘      └──────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Status Relationships

| Booking Status | Payment Status | Description |
|----------------|----------------|-------------|
| `pending` | `pending` | Booking created, awaiting payment |
| `confirmed` | `completed` | Payment received, booking confirmed |
| `cancelled` | `completed` | Booking cancelled, payment not yet refunded |
| `cancelled` | `refunded` | Booking cancelled and payment refunded |

### Business Rules

1. A **booking** starts as `pending` when created
2. A **payment** starts as `pending` when created
3. When a payment becomes `completed`, the booking should become `confirmed`
4. When a booking is `cancelled`:
   - If a `completed` payment exists, a refund should be created (new payment with negative amount and `refunded` status)
   - The original payment remains `completed` for audit purposes

## Database Commands

```bash
# Run migrations
npm run migrate

# Run seeds
npm run seed

# Reset database (migrate + seed)
npm run db:reset
```

## Project Structure

```
src/
├── index.ts              # Koa app entry point
├── db.ts                 # PostgreSQL connection pool
├── models/               # Database operations
│   ├── tripModel.ts
│   ├── travelerModel.ts
│   ├── bookingModel.ts
│   └── paymentModel.ts
├── middleware/           # Request handlers
│   ├── tripsMiddleware.ts
│   ├── travelersMiddleware.ts
│   ├── bookingsMiddleware.ts
│   └── paymentsMiddleware.ts
├── routes/               # Route definitions
│   ├── index.ts
│   ├── trips.ts
│   ├── travelers.ts
│   ├── bookings.ts
│   └── payments.ts
└── schemas/              # Zod validation schemas
    ├── trip.ts
    ├── traveler.ts
    ├── booking.ts
    └── payment.ts
```

## Validation with Zod

All request bodies are validated using [Zod](https://zod.dev/) schemas. Validation schemas are defined in `src/schemas/`.

### Example Schema

```typescript
// src/schemas/trip.ts
import { z } from 'zod'

export const tripCreateSchema = z.object({
  title: z.string().min(1).max(255),
  destination: z.string().min(1).max(255),
  start_date: z.string().date(),
  end_date: z.string().date(),
})

export type TripCreate = z.infer<typeof tripCreateSchema>
```

### Validation in Middleware

```typescript
// src/middleware/tripsMiddleware.ts
export async function createTrip(ctx: Context) {
  const validation = tripCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = {
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors
    }
    return
  }

  const trip = await TripModel.create(validation.data)
  ctx.status = 201
  ctx.body = trip
}
```

### Validation Error Response

When validation fails, the API returns a 400 response with field-specific errors:

```json
{
  "error": "Validation failed",
  "details": {
    "title": ["String must contain at least 1 character(s)"],
    "start_date": ["Invalid date"]
  }
}
```

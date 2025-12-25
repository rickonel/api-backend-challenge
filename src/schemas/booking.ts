import { z } from 'zod'

export const BookingStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
} as const

export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled'])

export const bookingSchema = z.object({
  id: z.number().int(),
  trip_id: z.number().int(),
  traveler_id: z.number().int(),
  status: bookingStatusSchema,
  created_at: z.string().datetime().optional(),
})

export const bookingCreateSchema = bookingSchema.omit({ id: true, created_at: true, status: true })

export const bookingUpdateSchema = z.object({
  trip_id: z.number().int().optional(),
  traveler_id: z.number().int().optional(),
  status: bookingStatusSchema.optional(),
})

export type Booking = z.infer<typeof bookingSchema>
export type BookingCreate = z.infer<typeof bookingCreateSchema>
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>

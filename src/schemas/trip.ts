import { z } from 'zod'

export const tripSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1).max(255),
  destination: z.string().min(1).max(255),
  start_date: z.string().date(),
  end_date: z.string().date(),
  created_at: z.string().datetime().optional(),
})

export const tripCreateSchema = tripSchema.omit({ id: true, created_at: true })

export const tripUpdateSchema = tripCreateSchema.partial()

export type Trip = z.infer<typeof tripSchema>
export type TripCreate = z.infer<typeof tripCreateSchema>
export type TripUpdate = z.infer<typeof tripUpdateSchema>

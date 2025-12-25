import { z } from 'zod'

export const travelerSchema = z.object({
  id: z.number().int(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  created_at: z.string().datetime().optional(),
})

export const travelerCreateSchema = travelerSchema.omit({ id: true, created_at: true })

export const travelerUpdateSchema = travelerCreateSchema.partial()

export type Traveler = z.infer<typeof travelerSchema>
export type TravelerCreate = z.infer<typeof travelerCreateSchema>
export type TravelerUpdate = z.infer<typeof travelerUpdateSchema>

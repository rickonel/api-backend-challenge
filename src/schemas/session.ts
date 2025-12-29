import { z } from 'zod'

export const sessionSchema = z.object({
  id: z.string(),
  user_id: z.number().int(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime().optional(),
})

export const sessionCreateSchema = z.object({
  id: z.string(),
  user_id: z.number().int(),
  expires_at: z.string().datetime(),
})

export type Session = z.infer<typeof sessionSchema>
export type SessionCreate = z.infer<typeof sessionCreateSchema>

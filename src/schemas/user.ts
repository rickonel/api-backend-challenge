import { z } from 'zod'

export const userPublicSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_id: z.number().int(),
  created_at: z.string().datetime(),
})

export const userRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_id: z.number().int(),
})

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type UserPublic = z.infer<typeof userPublicSchema>
export type UserRegisterInput = z.infer<typeof userRegisterSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>

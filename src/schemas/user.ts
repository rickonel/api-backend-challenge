import { z } from 'zod'

export const userSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_id: z.number().int(),
  created_at: z.string().datetime().optional(),
})

export const userRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_id: z.number().int(),
})

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const userPublicSchema = userSchema.omit({ password_hash: true })

export type User = z.infer<typeof userSchema>
export type UserRegister = z.infer<typeof userRegisterSchema>
export type UserLogin = z.infer<typeof userLoginSchema>
export type UserPublic = z.infer<typeof userPublicSchema>

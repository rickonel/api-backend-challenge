import { z } from 'zod'

export const organizationSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  created_at: z.string().datetime().optional(),
})

export const organizationCreateSchema = organizationSchema.omit({ id: true, created_at: true })

export type Organization = z.infer<typeof organizationSchema>
export type OrganizationCreate = z.infer<typeof organizationCreateSchema>

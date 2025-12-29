import { z } from 'zod'

export const shareWithUserSchema = z.object({
  permission_level: z.enum(['read', 'write']),
})

export type ShareWithUser = z.infer<typeof shareWithUserSchema>

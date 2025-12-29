import { z } from 'zod'

export const shareWithOrganizationSchema = z.object({
  permission_level: z.enum(['read', 'write']),
})

export type ShareWithOrganization = z.infer<typeof shareWithOrganizationSchema>

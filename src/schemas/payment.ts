import { z } from 'zod'

export const PaymentStatus = {
  Pending: 'pending',
  Completed: 'completed',
  Refunded: 'refunded',
} as const

export const paymentStatusSchema = z.enum(['pending', 'completed', 'refunded'])

export const paymentSchema = z.object({
  id: z.number().int(),
  booking_id: z.number().int(),
  amount: z.number(),
  currency: z.string().length(3).default('EUR'),
  status: paymentStatusSchema,
  created_at: z.string().datetime().optional(),
})

export const paymentCreateSchema = paymentSchema.omit({ id: true, created_at: true, status: true })

export const paymentUpdateSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().length(3).optional(),
  status: paymentStatusSchema.optional(),
})

export type Payment = z.infer<typeof paymentSchema>
export type PaymentCreate = z.infer<typeof paymentCreateSchema>
export type PaymentUpdate = z.infer<typeof paymentUpdateSchema>

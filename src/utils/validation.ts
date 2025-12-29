import { Context } from 'koa'
import { z } from 'zod'

export function validateBody<T extends z.ZodTypeAny>(
  ctx: Context,
  schema: T
): z.infer<T> {
  const validation = schema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  return validation.data
}

export function validateHasFields(ctx: Context, data: Record<string, any>) {
  if (Object.keys(data).length === 0) {
    ctx.throw(400, 'No fields to update')
  }
}

import { Context } from 'koa'

export async function requireResource<T>(
  ctx: Context,
  finder: () => Promise<T | null | undefined>,
  resourceName: string,
  statusCode: 400 | 404 = 404
): Promise<T> {
  const resource = await finder()
  if (!resource) {
    ctx.throw(statusCode, `${resourceName} not found`)
  }
  return resource
}

export async function handleUniqueConstraint<T>(
  ctx: Context,
  operation: () => Promise<T>,
  message: string = 'Resource already exists'
): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      ctx.throw(409, message)
    }
    throw error
  }
}

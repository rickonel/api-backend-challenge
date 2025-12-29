import { Context } from 'koa'

/**
 * Parse an integer ID from route parameters.
 * Throws 400 if the ID is not a valid integer.
 * 
 * @param ctx - Koa context
 * @param paramName - Name of the parameter (default: 'id')
 * @returns Parsed integer ID
 */
export function parseId(ctx: Context, paramName: string = 'id'): number {
  const id = parseInt(ctx.params[paramName], 10)
  if (isNaN(id)) {
    ctx.throw(400, `Invalid ${paramName}`)
  }
  return id
}

/**
 * Parse an optional integer from query parameters.
 * Returns undefined if the value is not a valid string or cannot be parsed.
 * 
 * @param value - Query parameter value
 * @returns Parsed integer or undefined
 */
export function parseQueryInt(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

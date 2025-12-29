import { Context } from 'koa'

export function parseId(ctx: Context, paramName: string = 'id'): number {
  const id = parseInt(ctx.params[paramName], 10)
  if (isNaN(id)) {
    ctx.throw(400, `Invalid ${paramName}`)
  }
  return id
}

export function parseQueryInt(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

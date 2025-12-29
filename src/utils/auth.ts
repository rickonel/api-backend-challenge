import { Context } from 'koa'
import { UserPublic } from '../schemas/user'


export function requireUser(ctx: Context): UserPublic {
  const user = ctx.state.user as UserPublic | undefined
  if (!user) {
    ctx.throw(401, 'Authentication required')
  }
  return user
}

export function getUser(ctx: Context): UserPublic | undefined {
  return ctx.state.user as UserPublic | undefined
}

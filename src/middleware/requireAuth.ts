import { Context, Next } from 'koa'
import SessionModel from '../models/sessionModel'
import UserModel from '../models/userModel'


export async function authenticate(ctx: Context, next: Next) {
  const sessionId = ctx.cookies.get('session_id')

  if (!sessionId) {
    await next()
    return
  }

  const session = await SessionModel.findByIdAndNotExpired(sessionId)
  if (!session) {
    ctx.cookies.set('session_id', '', { maxAge: 0 })
    await next()
    return
  }

  const user = await UserModel.findByIdPublic(session.user_id)
  if (user) {
    ctx.state.user = user
  }

  await next()
}

export async function requireAuth(ctx: Context, next: Next) {
  if (!ctx.state.user) ctx.throw(401, 'Authentication required')
  await next()
}

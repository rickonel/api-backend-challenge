import { Context, Next } from 'koa'
import * as SessionModel from '../models/sessionModel'
import * as UserModel from '../models/userModel'

const SESSION_COOKIE_NAME = 'session_id'

export async function authenticate(ctx: Context, next: Next) {
  const sessionId = ctx.cookies.get(SESSION_COOKIE_NAME)
  if (!sessionId) {
    await next()
    return
  }

  const session = await SessionModel.findById(sessionId)
  if (!session) {
    await next()
    return
  }

  const user = await UserModel.findById(session.user_id)
  if (user) {
    const { password_hash, ...publicUser } = user
    ctx.state.user = publicUser
  }

  await next()
}

export async function requireAuth(ctx: Context, next: Next) {
  if (!ctx.state.user) {
    ctx.throw(401, 'Authentication required')
  }

  await next()
}

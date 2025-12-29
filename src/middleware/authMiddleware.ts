import { Context } from 'koa'
import { addDays } from 'date-fns'
import { userRegisterSchema, userLoginSchema, UserPublic } from '../schemas/user'
import * as UserModel from '../models/userModel'
import * as SessionModel from '../models/sessionModel'
import { hashPassword, comparePassword, generateSessionId } from '../utils/crypto'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_DAYS = 7

function toPublicUser(user: UserModel.UserRecord): UserPublic {
  const { password_hash, ...rest } = user
  return rest
}

async function createSession(ctx: Context, userId: number) {
  const sessionId = generateSessionId()
  const expiresAt = addDays(new Date(), SESSION_DAYS).toISOString()

  await SessionModel.create({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  })

  ctx.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  })
}

export async function register(ctx: Context) {
  const validation = userRegisterSchema.safeParse(ctx.request.body)
  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const existingUser = await UserModel.findByEmail(validation.data.email)
  if (existingUser) {
    ctx.throw(409, 'Email already exists')
  }

  const passwordHash = await hashPassword(validation.data.password)
  const user = await UserModel.create({
    email: validation.data.email,
    password_hash: passwordHash,
    first_name: validation.data.first_name,
    last_name: validation.data.last_name,
    organization_id: validation.data.organization_id,
  })

  await createSession(ctx, user.id)

  ctx.status = 201
  ctx.body = { user: toPublicUser(user) }
}

export async function login(ctx: Context) {
  const validation = userLoginSchema.safeParse(ctx.request.body)
  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  const user = await UserModel.findByEmail(validation.data.email)
  if (!user) {
    ctx.throw(401, 'Invalid email or password')
  }

  const passwordMatches = await comparePassword(validation.data.password, user.password_hash)
  if (!passwordMatches) {
    ctx.throw(401, 'Invalid email or password')
  }

  await createSession(ctx, user.id)

  ctx.body = { user: toPublicUser(user) }
}

export async function logout(ctx: Context) {
  const sessionId = ctx.cookies.get(SESSION_COOKIE_NAME)
  if (sessionId) {
    await SessionModel.remove(sessionId)
    ctx.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, maxAge: 0 })
  }

  ctx.body = { message: 'Logged out successfully' }
}

export async function me(ctx: Context) {
  const user = ctx.state.user as UserPublic | undefined
  if (!user) {
    ctx.throw(401, 'Authentication required')
  }

  ctx.body = { user }
}

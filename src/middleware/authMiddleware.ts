import { Context } from 'koa'
import UserModel from '../models/userModel'
import SessionModel from '../models/sessionModel'
import OrganizationModel from '../models/organizationModel'
import { userRegisterSchema, userLoginSchema } from '../schemas/user'
import { hashPassword, comparePassword, generateSessionId } from '../utils/crypto'
import { validateBody } from '../utils/validation'
import { requireUser } from '../utils/auth'


// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export async function register(ctx: Context) {
  const data = validateBody(ctx, userRegisterSchema)
  const { email, password, first_name, last_name, organization_id } = data

  const existingUser = await UserModel.findByEmail(email)
  if (existingUser) ctx.throw(400, 'User with this email already exists')

  const organization = await OrganizationModel.findById(organization_id)
  if (!organization) ctx.throw(400, 'Organization not found')

  const password_hash = await hashPassword(password)

  const user = await UserModel.create({
    email,
    password_hash,
    first_name,
    last_name,
    organization_id,
  })

  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  await SessionModel.create({
    id: sessionId,
    user_id: user.id,
    expires_at: expiresAt,
  })

  ctx.cookies.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_MS,
  })

  const publicUser = await UserModel.findByIdPublic(user.id)

  ctx.status = 201
  ctx.body = { user: publicUser }
}

export async function login(ctx: Context) {

    
  const data = validateBody(ctx, userLoginSchema)
  const { email, password } = data

  const user = await UserModel.findByEmail(email)
  if (!user) ctx.throw(401, 'Invalid email or password')

  const isValid = await comparePassword(password, user.password_hash)
  if (!isValid) ctx.throw(401, 'Invalid email or password')

  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  await SessionModel.create({
    id: sessionId,
    user_id: user.id,
    expires_at: expiresAt,
  })

  ctx.cookies.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_MS,
  })

  const publicUser = await UserModel.findByIdPublic(user.id)

  ctx.status = 200
  ctx.body = { user: publicUser }
}

export async function logout(ctx: Context) {
  const sessionId = ctx.cookies.get('session_id')

  if (sessionId) {
    await SessionModel.remove(sessionId)
  }

  ctx.cookies.set('session_id', '', { maxAge: 0 })
  ctx.status = 200
  ctx.body = { message: 'Logged out successfully' }
}

export async function me(ctx: Context) {
  const user = requireUser(ctx)
  ctx.body = { user }
}

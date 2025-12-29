import { Context } from 'koa'
import TravelerModel from '../models/travelerModel'
import { travelerCreateSchema, travelerUpdateSchema } from '../schemas/traveler'
import { validateBody, validateHasFields } from '../utils/validation'

export async function getTravelers(ctx: Context) {
  const email = ctx.query.email as string | undefined
  const travelers = await TravelerModel.findAll(email)
  ctx.body = travelers
}

export async function getTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const traveler = await TravelerModel.findById(id)

  if (!traveler) ctx.throw(404, 'Traveler not found')

  ctx.body = traveler
}

export async function createTraveler(ctx: Context) {
  const data = validateBody(ctx, travelerCreateSchema)

  try {
    const traveler = await TravelerModel.create(data)
    ctx.status = 201
    ctx.body = traveler
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      ctx.throw(409, 'Email already exists')
    }
    throw error
  }
}

export async function updateTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const data = validateBody(ctx, travelerUpdateSchema)
  validateHasFields(ctx, data)

  try {
    const traveler = await TravelerModel.update(id, data)

    if (!traveler) ctx.throw(404, 'Traveler not found')

    ctx.body = traveler
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      ctx.throw(409, 'Email already exists')
    }
    throw error
  }
}

export async function deleteTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await TravelerModel.remove(id)

  if (!deleted) ctx.throw(404, 'Traveler not found')

  ctx.status = 204
}

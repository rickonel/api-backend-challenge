import { Context } from 'koa'
import TravelerModel from '../models/travelerModel'
import { travelerCreateSchema, travelerUpdateSchema } from '../schemas/traveler'

export async function getTravelers(ctx: Context) {
  const email = ctx.query.email as string | undefined
  const travelers = await TravelerModel.findAll(email)
  ctx.body = travelers
}

export async function getTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const traveler = await TravelerModel.findById(id)

  if (!traveler) {
    ctx.status = 404
    ctx.body = { error: 'Traveler not found' }
    return
  }

  ctx.body = traveler
}

export async function createTraveler(ctx: Context) {
  const validation = travelerCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  try {
    const traveler = await TravelerModel.create(validation.data)
    ctx.status = 201
    ctx.body = traveler
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      ctx.status = 409
      ctx.body = { error: 'Email already exists' }
      return
    }
    throw error
  }
}

export async function updateTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const validation = travelerUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.status = 400
    ctx.body = { error: 'Validation failed', details: validation.error.flatten().fieldErrors }
    return
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.status = 400
    ctx.body = { error: 'No fields to update' }
    return
  }

  try {
    const traveler = await TravelerModel.update(id, validation.data)

    if (!traveler) {
      ctx.status = 404
      ctx.body = { error: 'Traveler not found' }
      return
    }

    ctx.body = traveler
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('unique')) {
      ctx.status = 409
      ctx.body = { error: 'Email already exists' }
      return
    }
    throw error
  }
}

export async function deleteTraveler(ctx: Context) {
  const id = parseInt(ctx.params.id, 10)
  const deleted = await TravelerModel.remove(id)

  if (!deleted) {
    ctx.status = 404
    ctx.body = { error: 'Traveler not found' }
    return
  }

  ctx.status = 204
}

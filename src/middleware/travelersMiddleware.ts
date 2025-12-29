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

  if (!traveler) ctx.throw(404, 'Traveler not found')

  ctx.body = traveler
}

export async function createTraveler(ctx: Context) {
  const validation = travelerCreateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  try {
    const traveler = await TravelerModel.create(validation.data)
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
  const validation = travelerUpdateSchema.safeParse(ctx.request.body)

  if (!validation.success) {
    ctx.throw(400, 'Validation failed', {
      details: validation.error.flatten().fieldErrors,
    })
  }

  if (Object.keys(validation.data).length === 0) {
    ctx.throw(400, 'No fields to update')
  }

  try {
    const traveler = await TravelerModel.update(id, validation.data)

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

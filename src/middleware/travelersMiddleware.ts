import { Context } from 'koa'
import TravelerModel from '../models/travelerModel'
import { travelerCreateSchema, travelerUpdateSchema } from '../schemas/traveler'
import { validateBody, validateHasFields } from '../utils/validation'
import { parseId } from '../utils/params'
import { requireResource, handleUniqueConstraint } from '../utils/resources'

export async function getTravelers(ctx: Context) {
  const email = ctx.query.email as string | undefined
  const travelers = await TravelerModel.findAll(email)
  ctx.body = travelers
}

export async function getTraveler(ctx: Context) {
  const id = parseId(ctx)
  const traveler = await requireResource(ctx, () => TravelerModel.findById(id), 'Traveler')

  ctx.body = traveler
}

export async function createTraveler(ctx: Context) {
  const data = validateBody(ctx, travelerCreateSchema)

  const traveler = await handleUniqueConstraint(
    ctx,
    () => TravelerModel.create(data),
    'Email already exists'
  )

  ctx.status = 201
  ctx.body = traveler
}

export async function updateTraveler(ctx: Context) {
  const id = parseId(ctx)
  const data = validateBody(ctx, travelerUpdateSchema)
  validateHasFields(ctx, data)

  const traveler = await handleUniqueConstraint(
    ctx,
    async () => {
      const updated = await TravelerModel.update(id, data)
      if (!updated) ctx.throw(404, 'Traveler not found')
      return updated
    },
    'Email already exists'
  )

  ctx.body = traveler
}

export async function deleteTraveler(ctx: Context) {
  const id = parseId(ctx)
  const deleted = await TravelerModel.remove(id)

  if (!deleted) ctx.throw(404, 'Traveler not found')

  ctx.status = 204
}

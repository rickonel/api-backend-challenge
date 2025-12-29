import { executeQuery } from '../db'
import { Organization, OrganizationCreate } from '../schemas/organization'


async function findAll(): Promise<Organization[]> {
  const query = 'SELECT * FROM organizations ORDER BY name'
  const result = await executeQuery<Organization>(query)
  return result.rows
}

async function findById(id: number): Promise<Organization | undefined> {
  const query = 'SELECT * FROM organizations WHERE id = $1'
  const result = await executeQuery<Organization>(query, [id])
  return result.rows[0]
}

async function create(data: OrganizationCreate): Promise<Organization> {
  const query = `
    INSERT INTO organizations (name)
    VALUES ($1)
    RETURNING *
  `
  const result = await executeQuery<Organization>(query, [data.name])
  return result.rows[0]
}

export default {
  findAll,
  findById,
  create,
}

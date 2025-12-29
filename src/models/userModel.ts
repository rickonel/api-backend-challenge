import { executeQuery } from '../db'
import { User, UserPublic } from '../schemas/user'

async function findAll(): Promise<UserPublic[]> {
  const query = 'SELECT id, email, first_name, last_name, organization_id, created_at FROM users ORDER BY created_at DESC'
  const result = await executeQuery<UserPublic>(query)
  return result.rows
}

async function findById(id: number): Promise<User | undefined> {
  const query = 'SELECT * FROM users WHERE id = $1'
  const result = await executeQuery<User>(query, [id])
  return result.rows[0]
}

async function findByIdPublic(id: number): Promise<UserPublic | undefined> {
  const query = 'SELECT id, email, first_name, last_name, organization_id, created_at FROM users WHERE id = $1'
  const result = await executeQuery<UserPublic>(query, [id])
  return result.rows[0]
}

async function findByEmail(email: string): Promise<User | undefined> {
  const query = 'SELECT * FROM users WHERE email = $1'
  const result = await executeQuery<User>(query, [email])
  return result.rows[0]
}

async function create(data: { 
  email: string
  password_hash: string
  first_name: string
  last_name: string
  organization_id: number
}): Promise<User> {
  const query = `
    INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `
  const result = await executeQuery<User>(query, [
    data.email,
    data.password_hash,
    data.first_name,
    data.last_name,
    data.organization_id,
  ])
  return result.rows[0]
}

export default {
  findAll,
  findById,
  findByIdPublic,
  findByEmail,
  create,
}

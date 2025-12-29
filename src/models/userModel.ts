import { executeQuery } from '../db'
import { UserPublic } from '../schemas/user'

export interface UserRecord extends UserPublic {
  password_hash: string
}

export async function findByEmail(email: string): Promise<UserRecord | undefined> {
  const result = await executeQuery<UserRecord>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  )
  return result.rows[0]
}

export async function findById(id: number): Promise<UserRecord | undefined> {
  const result = await executeQuery<UserRecord>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

export async function create(data: {
  email: string
  password_hash: string
  first_name: string
  last_name: string
  organization_id: number
}): Promise<UserRecord> {
  const result = await executeQuery<UserRecord>(
    `INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.email, data.password_hash, data.first_name, data.last_name, data.organization_id]
  )
  return result.rows[0]
}

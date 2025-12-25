import { Pool, QueryResult, QueryResultRow } from 'pg'

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'backend_challenge',
})

export async function executeQuery<T extends QueryResultRow>(
  query: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(query, params)
    return result
  } finally {
    client.release()
  }
}

export { pool }

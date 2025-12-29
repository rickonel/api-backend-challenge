import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCallback)
const SALT_LENGTH = 16
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${derivedKey.toString('hex')}.${salt}`
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const [storedHash, salt] = hash.split('.')
  if (!storedHash || !salt) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  const storedBuffer = Buffer.from(storedHash, 'hex')

  if (storedBuffer.length !== derivedKey.length) {
    return false
  }

  return timingSafeEqual(storedBuffer, derivedKey)
}

export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

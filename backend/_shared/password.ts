import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const PASSWORD_PREFIX = 'scrypt'
const PASSWORD_KEY_LENGTH = 64

function toHex(value: Buffer) {
  return value.toString('hex')
}

export function assertStrongPassword(password: string) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
}

export function hashPassword(password: string) {
  assertStrongPassword(password)

  const salt = randomBytes(16)
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH)

  return `${PASSWORD_PREFIX}$${toHex(salt)}$${toHex(derivedKey)}`
}

export function verifyPassword(password: string, storedPassword: string) {
  if (!storedPassword.startsWith(`${PASSWORD_PREFIX}$`)) {
    return storedPassword === password
  }

  const [, saltHex, hashHex] = storedPassword.split('$')
  if (!saltHex || !hashHex) {
    return false
  }

  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, salt, expected.length)

  return timingSafeEqual(expected, actual)
}

export function assertNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`)
  }

  return value.trim()
}

export function assertEmail(value: unknown, fieldName: string) {
  const normalized = assertNonEmptyString(value, fieldName).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error(`${fieldName} must be a valid email address.`)
  }

  return normalized
}

export function assertPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  return value
}

export function assertPositiveInteger(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a valid positive integer.`)
  }

  return value
}

export function assertRecord(value: unknown, fieldName: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a valid object.`)
  }

  return value as Record<string, unknown>
}

export function assertArray<T>(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`)
  }

  return value as T[]
}

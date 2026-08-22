import { createHash, randomInt } from 'node:crypto'

export function generateOtpCode() {
  return String(randomInt(100000, 1000000)) // 6 digits, 100000-999999
}

export function hashOtpCode(code) {
  return createHash('sha256').update(code).digest('hex')
}

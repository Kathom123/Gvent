import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { readAppUser } from '@/lib/firebase/users-store'

const APP_COOKIE = 'app-session'
const SESSION_SECONDS = 60 * 60 * 24 * 7 // 7 días
const MAX_ATTEMPTS = 5
const ATTEMPT_WINDOW_MS = 60_000

export type AppUser = {
  id: string
  username: string
  displayName: string
}

function sessionSecret() {
  return process.env.APP_SESSION_SECRET || 'dev-only-secret-change-me'
}

function sign(value: string) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url')
}

function createToken(username: string, expiresAtSeconds: number) {
  const payload = `${username}.${expiresAtSeconds}`
  return `${payload}.${sign(payload)}`
}

function verifyToken(token: string | undefined): AppUser | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [username, expiresAt, signature] = parts
  const expected = sign(`${username}.${expiresAt}`)
  const given = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (given.length !== expectedBuf.length || !timingSafeEqual(given, expectedBuf)) return null
  const exp = Number(expiresAt)
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(username)) return null
  return { id: username, username, displayName: username }
}

// Protección básica contra fuerza bruta (por instancia del servidor).
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS })
    return true
  }
  entry.count += 1
  return entry.count <= MAX_ATTEMPTS
}

export function createAppAuth() {
  async function getCurrentUser(): Promise<AppUser | null> {
    const token = (await cookies()).get(APP_COOKIE)?.value
    return verifyToken(token)
  }

  async function setSession(username: string, expiresIn = SESSION_SECONDS) {
    const secure = process.env.NODE_ENV === 'production'
    ;(await cookies()).set(APP_COOKIE, createToken(username, Math.floor(Date.now() / 1000) + expiresIn), {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      partitioned: secure,
      path: '/',
      maxAge: expiresIn,
    })
  }

  return {
    getCurrentUser,
    async login(username: string, password: string): Promise<AppUser> {
      const normalized = username.toLowerCase()
      if (!checkRateLimit(normalized)) {
        const error = new Error('Demasiados intentos.') as Error & { status: number }
        error.status = 429
        throw error
      }
      const record = await readAppUser(normalized)
      if (!record) {
        const error = new Error('Credenciales inválidas.') as Error & { status: number }
        error.status = 401
        throw error
      }
      const candidate = scryptSync(password, record.salt, 64)
      const stored = Buffer.from(record.hash, 'hex')
      if (stored.length !== candidate.length || !timingSafeEqual(candidate, stored)) {
        const error = new Error('Credenciales inválidas.') as Error & { status: number }
        error.status = 401
        throw error
      }
      attempts.delete(normalized)
      const user: AppUser = {
        id: record.username,
        username: record.username,
        displayName: record.displayName,
      }
      await setSession(record.username)
      return user
    },
    async logout() {
      await setSession('', 0)
    },
  }
}

export function generateUserSecrets(password: string, saltHex?: string) {
  const salt = saltHex ?? randomBytes(16).toString('hex')
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

export const appAuth = createAppAuth()

import 'server-only'
import { getWorkspaceFirebase } from './admin'
import { FirebaseServiceError } from './realtime-store'

export type AppUserRecord = {
  username: string
  displayName: string
  salt: string
  hash: string
}

export function assertValidUsername(username: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(username)) {
    throw new FirebaseServiceError('INVALID_USERNAME', 'El nombre de usuario no es válido.')
  }
}

async function accessToken() {
  const { app } = getWorkspaceFirebase()
  const credential = app.options.credential
  if (!credential) {
    throw new FirebaseServiceError(
      'FIREBASE_CREDENTIALS',
      'No hay credenciales de Firebase configuradas.',
    )
  }
  const result = await credential.getAccessToken()
  return result.access_token
}

/**
 * Lee un usuario de la aplicación desde la Realtime Database:
 * gasvent/v1/users/{username}
 */
export async function readAppUser(username: string): Promise<AppUserRecord | null> {
  assertValidUsername(username)
  const { databaseURL } = getWorkspaceFirebase()
  const token = await accessToken()
  let response: Response
  try {
    response = await fetch(new URL(`/gasvent/v1/users/${username}.json`, databaseURL), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new FirebaseServiceError(
      'FIREBASE_NETWORK',
      'Firebase no responde. Comprueba la conexión del servidor.',
    )
  }
  if (!response.ok) {
    throw new FirebaseServiceError(
      response.status === 401 || response.status === 403
        ? 'FIREBASE_PERMISSIONS'
        : `FIREBASE_DATABASE_HTTP_${response.status}`,
      'La Realtime Database rechazó la lectura de usuarios.',
    )
  }
  const data = (await response.json()) as Partial<AppUserRecord> | null
  if (!data || typeof data !== 'object') return null
  if (
    typeof data.username !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.salt !== 'string' ||
    typeof data.hash !== 'string'
  ) {
    return null
  }
  return {
    username: data.username,
    displayName: data.displayName,
    salt: data.salt,
    hash: data.hash,
  }
}

import 'server-only'
import { getWorkspaceFirebase } from './admin'
import { createRealtimeWorkspaceStore, FirebaseServiceError } from './realtime-store'
import type { WorkspaceOperation } from '@/domain/workspace'

export { FirebaseServiceError } from './realtime-store'

async function accessToken() {
  const { app } = getWorkspaceFirebase()
  try {
    const credential = app.options.credential
    if (!credential) throw new Error('No credential.')
    let timer: ReturnType<typeof setTimeout>
    try {
      const result = await Promise.race([
        credential.getAccessToken(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Credential timeout.')), 8000)
        }),
      ])
      return result.access_token
    } finally {
      clearTimeout(timer!)
    }
  } catch {
    throw new FirebaseServiceError(
      'FIREBASE_CREDENTIALS',
      'No se pudo autenticar la cuenta de servicio de Firebase.',
    )
  }
}

function store() {
  const { databaseURL } = getWorkspaceFirebase()
  return createRealtimeWorkspaceStore({ databaseURL, getAccessToken: accessToken })
}

export async function readWorkspace(userId: string) {
  return store().read(userId)
}

export async function updateWorkspace(userId: string, operations: WorkspaceOperation[]) {
  return store().update(userId, operations)
}

import {
  applyOperations,
  createWorkspace,
  parseWorkspace,
  type WorkspaceOperation,
} from '../../domain/workspace'

export class FirebaseServiceError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function createRealtimeWorkspaceStore(config: {
  databaseURL: string
  getAccessToken: () => Promise<string>
  fetcher?: typeof fetch
  now?: () => number
}) {
  const fetcher = config.fetcher ?? fetch
  const now = config.now ?? Date.now

  async function request(
    userId: string,
    options: { etag?: string; readEtag?: boolean; body?: unknown } = {},
  ) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) throw new Error('Invalid workspace identity.')
    const token = await config.getAccessToken()
    let response: Response
    try {
      response = await fetcher(
        new URL(`/gasvent/v1/workspaces/${userId}/simulation.json`, config.databaseURL),
        {
          method: options.body ? 'PUT' : 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.readEtag ? { 'X-Firebase-ETag': 'true' } : {}),
            ...(options.etag ? { 'if-match': options.etag } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        },
      )
    } catch {
      throw new FirebaseServiceError(
        'FIREBASE_NETWORK',
        'Firebase no responde. Comprueba la conexión del servidor.',
      )
    }
    if (response.status === 412) return { conflict: true as const }
    if (!response.ok) {
      throw new FirebaseServiceError(
        response.status === 401 || response.status === 403
          ? 'FIREBASE_PERMISSIONS'
          : `FIREBASE_DATABASE_HTTP_${response.status}`,
        response.status === 401 || response.status === 403
          ? 'La cuenta de servicio no tiene acceso a Realtime Database.'
          : `No se pudo acceder a la base (HTTP ${response.status}). Revisa su URL, su disponibilidad y el acceso de red del servidor.`,
      )
    }
    return {
      conflict: false as const,
      value: await response.json(),
      etag: response.headers.get('etag'),
    }
  }

  return {
    async read(userId: string) {
      const result = await request(userId)
      if (result.conflict) throw new Error('Unexpected read conflict.')
      return result.value === null ? createWorkspace() : parseWorkspace(result.value)
    },
    async update(userId: string, operations: WorkspaceOperation[]) {
      // ETag compare-and-set rejects stale writes instead of losing another client's changes.
      for (let attempt = 0; attempt < 6; attempt++) {
        const read = await request(userId, { readEtag: true })
        if (read.conflict || !read.etag)
          throw new Error('Firebase did not provide a version identifier.')
        const previous = read.value === null ? createWorkspace() : parseWorkspace(read.value)
        const next = applyOperations(previous, operations, now())
        if (next.revision === previous.revision) return previous
        const result = await request(userId, { etag: read.etag, body: next })
        if (!result.conflict) return parseWorkspace(result.value)
      }
      throw new FirebaseServiceError(
        'FIREBASE_CONFLICT',
        'Hay cambios simultáneos. Vuelve a sincronizar.',
      )
    },
  }
}

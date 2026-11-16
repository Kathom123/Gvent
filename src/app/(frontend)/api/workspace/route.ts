import { appAuth } from '@/lib/app-auth'
import { acceptsAuthMutation, privateHeaders } from '@/lib/auth-request'
import { FirebaseConfigurationError } from '@/lib/firebase/admin'
import {
  FirebaseServiceError,
  readWorkspace,
  updateWorkspace,
} from '@/lib/firebase/workspace-store'
import { parseOperations, WorkspaceValidationError } from '@/domain/workspace'

export const runtime = 'nodejs'

function failure(error: unknown) {
  if (error instanceof FirebaseServiceError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: 503, headers: privateHeaders },
    )
  }
  if (error instanceof WorkspaceValidationError) {
    return Response.json(
      { error: error.message, code: 'INVALID_OPERATION' },
      { status: 422, headers: privateHeaders },
    )
  }
  return Response.json(
    {
      error:
        error instanceof FirebaseConfigurationError
          ? 'Firebase no está configurado correctamente en el servidor.'
          : 'No se pudo sincronizar con Firebase. Comprueba la conexión y los permisos del proyecto.',
      code:
        error instanceof FirebaseConfigurationError
          ? 'FIREBASE_CONFIGURATION'
          : 'FIREBASE_UNAVAILABLE',
    },
    { status: 503, headers: privateHeaders },
  )
}

export async function GET() {
  try {
    const user = await appAuth.getCurrentUser()
    if (!user)
      return Response.json({ error: 'Inicia sesión.' }, { status: 401, headers: privateHeaders })
    const workspace = await readWorkspace(String(user.id))
    return Response.json({ workspace, provider: 'firebase' }, { headers: privateHeaders })
  } catch (error) {
    return failure(error)
  }
}

export async function PATCH(request: Request) {
  if (!acceptsAuthMutation(request)) {
    return Response.json(
      { error: 'Solicitud no permitida.' },
      { status: 403, headers: privateHeaders },
    )
  }
  try {
    const user = await appAuth.getCurrentUser()
    if (!user)
      return Response.json({ error: 'Inicia sesión.' }, { status: 401, headers: privateHeaders })
    const text = await request.text()
    if (text.length > 32_000) throw new WorkspaceValidationError('Request is too large.')
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      throw new WorkspaceValidationError('Invalid JSON.')
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !('operations' in body) ||
      Object.keys(body).some((key) => key !== 'operations')
    ) {
      throw new WorkspaceValidationError('Send only workspace operations.')
    }
    const operations = parseOperations(body.operations)
    const workspace = await updateWorkspace(String(user.id), operations)
    return Response.json({ workspace, provider: 'firebase' }, { headers: privateHeaders })
  } catch (error) {
    return failure(error)
  }
}

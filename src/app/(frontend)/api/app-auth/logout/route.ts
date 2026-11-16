import { appAuth } from '@/lib/app-auth'
import { acceptsAuthMutation, privateHeaders } from '@/lib/auth-request'

export async function POST(request: Request) {
  if (!acceptsAuthMutation(request)) {
    return Response.json(
      { error: 'Solicitud no permitida.' },
      { status: 403, headers: privateHeaders },
    )
  }
  try {
    await appAuth.logout()
    return Response.json({ success: true }, { headers: privateHeaders })
  } catch {
    return Response.json(
      { error: 'No se pudo cerrar la sesión. Comprueba tu conexión e inténtalo de nuevo.' },
      { status: 503, headers: privateHeaders },
    )
  }
}

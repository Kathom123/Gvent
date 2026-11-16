import { appAuth } from '@/lib/app-auth'
import { acceptsAuthMutation, privateHeaders } from '@/lib/auth-request'

export async function POST(request: Request) {
  if (!acceptsAuthMutation(request)) {
    return Response.json(
      { error: 'Solicitud no permitida.' },
      { status: 403, headers: privateHeaders },
    )
  }
  let data: unknown
  try {
    const text = await request.text()
    if (text.length > 4096) throw new Error('Input too large')
    data = JSON.parse(text)
  } catch {
    return Response.json(
      { error: 'Revisa los datos e inténtalo de nuevo.' },
      { status: 400, headers: privateHeaders },
    )
  }
  if (
    !data ||
    typeof data !== 'object' ||
    !('username' in data) ||
    typeof data.username !== 'string' ||
    !('password' in data) ||
    typeof data.password !== 'string' ||
    !data.username.trim() ||
    data.username.length > 80 ||
    !data.password ||
    data.password.length > 256 ||
    Object.keys(data).some((key) => !['username', 'password'].includes(key))
  ) {
    return Response.json(
      { error: 'Introduce tu usuario y contraseña.' },
      { status: 400, headers: privateHeaders },
    )
  }
  try {
    const user = await appAuth.login(data.username.trim(), data.password)
    return Response.json(
      { user: { displayName: user.displayName, username: user.username } },
      { headers: privateHeaders },
    )
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? error.status : null
    if (status === 400 || status === 401 || status === 403 || status === 423 || status === 429) {
      return Response.json(
        {
          error:
            status === 423 || status === 429
              ? 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.'
              : 'El usuario o la contraseña no son correctos.',
        },
        { status: status === 423 || status === 429 ? 429 : 401, headers: privateHeaders },
      )
    }
    return Response.json(
      { error: 'No se pudo iniciar sesión. Inténtalo de nuevo en un momento.' },
      { status: 503, headers: privateHeaders },
    )
  }
}

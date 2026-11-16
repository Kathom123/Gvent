import { appAuth } from '@/lib/app-auth'
import { privateHeaders } from '@/lib/auth-request'

export async function GET() {
  try {
    const user = await appAuth.getCurrentUser()
    if (!user) return Response.json({ user: null }, { status: 401, headers: privateHeaders })
    return Response.json(
      { user: { displayName: user.displayName, username: user.username } },
      { headers: privateHeaders },
    )
  } catch {
    return Response.json(
      { error: 'Servicio no disponible.' },
      { status: 503, headers: privateHeaders },
    )
  }
}

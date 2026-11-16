import 'server-only'

export function acceptsAuthMutation(request: Request) {
  return (
    request.headers.get('x-gasvent-request') === '1' &&
    request.headers.get('content-type')?.split(';')[0].trim() === 'application/json' &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  )
}

export const privateHeaders = { 'Cache-Control': 'private, no-store' }

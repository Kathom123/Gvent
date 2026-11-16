import 'server-only'
import { cert, getApps, initializeApp } from 'firebase-admin/app'

export class FirebaseConfigurationError extends Error {}

export function getWorkspaceFirebase() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!serviceAccount || !databaseURL) {
    throw new FirebaseConfigurationError('Firebase is not configured.')
  }
  const existing = getApps().find((app) => app.name === 'gasvent-sync')
  if (existing) return { app: existing, databaseURL: String(existing.options.databaseURL) }
  try {
    const url = new URL(databaseURL)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname) ||
      url.search ||
      url.hash ||
      !['', '/'].includes(url.pathname)
    ) {
      throw new Error('Invalid database URL.')
    }
    const credentials = JSON.parse(serviceAccount)
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
      throw new Error('Incomplete service account.')
    }
    const app = initializeApp(
      {
        credential: cert(credentials),
        databaseURL: url.origin,
      },
      'gasvent-sync',
    )
    return { app, databaseURL: url.origin }
  } catch {
    throw new FirebaseConfigurationError('Firebase server configuration is invalid.')
  }
}

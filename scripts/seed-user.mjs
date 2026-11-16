// Crea (o actualiza) un usuario de la app en la Realtime Database.
//
// Uso (desde la carpeta del proyecto):
//   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
//   FIREBASE_DATABASE_URL='https://TU-PROYECTO-default-rtdb.firebaseio.com' \
//   node scripts/seed-user.mjs agua agua "Agua"
//
// También puedes poner las variables en un archivo .env.local y usar:
//   node --env-file=.env.local scripts/seed-user.mjs agua agua "Agua"

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { scryptSync, randomBytes } from 'node:crypto'

const [username, password, displayNameArg] = process.argv.slice(2)

if (!username || !password) {
  console.error('Uso: node scripts/seed-user.mjs <usuario> <contraseña> [nombreVisible]')
  process.exit(1)
}
if (!/^[a-zA-Z0-9_-]{1,80}$/.test(username)) {
  console.error('El usuario solo puede tener letras, números, guiones y guion bajo (máx. 80).')
  process.exit(1)
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || readFileSync('./serviceAccount.json', 'utf8'),
)
const databaseURL = process.env.FIREBASE_DATABASE_URL

const app = initializeApp({ credential: cert(serviceAccount), databaseURL }, 'seed-user')
const salt = randomBytes(16).toString('hex')
const hash = scryptSync(password, salt, 64).toString('hex')

await getDatabase(app)
  .ref(`gasvent/v1/users/${username}`)
  .set({
    username,
    displayName: displayNameArg || username,
    salt,
    hash,
  })

console.log(`Usuario "${username}" creado/actualizado en gasvent/v1/users/${username}`)
process.exit(0)

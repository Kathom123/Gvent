# Firebase: configuración, sincronización y evolución

## Arquitectura de esta versión

```text
Android (Kotlin + WebView) / navegador
                  │ HTTPS + cookie HTTP-only
                  ▼
          Next.js / API Gvent
           │              │
           │              └── Payload: login y usuarios existentes
           ▼
    Firebase Admin SDK — credenciales OAuth en servidor
           │
           ▼
    Realtime Database REST — escrituras condicionales ETag
    gasvent/v1/workspaces/{id-del-usuario}/simulation
```

Firebase comparte el **estado de la simulación**, no controla hardware. Se sincronizan controles del ventilador, umbrales, temporizador, ajustes, dispositivos de demostración y los últimos 100 eventos. El historial gráfico sigue siendo una visualización de datos simulados.

Dos teléfonos con **la misma cuenta** comparten el mismo espacio. Cuentas distintas tienen rutas aisladas. La interfaz consulta cada **5 segundos** mientras está visible, y al recuperar foco o conexión; no se anuncia una conexión instantánea por WebSocket.

El login actual permanece en Payload, separado de Firebase y de los administradores del CMS. No tienes que activar Firebase Authentication para esta versión. La cuenta de prueba existente no se ha eliminado ni se ha migrado.

## 1. Configurar Firebase

1. Crea un proyecto Firebase dedicado a esta demostración.
2. En **Compilación → Realtime Database**, crea una base en la región que prefieras.
3. Elige **modo bloqueado**, no modo de prueba público.
4. En **Reglas**, aplica el archivo `firebase/database.rules.json` incluido en este ZIP:

   ```json
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```

5. Copia la URL HTTPS de la raíz de la base, sin una ruta de datos al final.
6. En **Configuración del proyecto → Cuentas de servicio**, genera una clave privada para el servidor. Para instalaciones futuras utiliza una cuenta dedicada con los permisos mínimos de Realtime Database necesarios; no una cuenta personal de propietario.
7. Configura en **Make settings → Secrets**:
   - `FIREBASE_DATABASE_URL`: URL de tu base.
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON completo de la cuenta de servicio.
8. Publica de nuevo el sitio Gvent y comprueba **Firebase conectado** en el panel.

No incluyas la cuenta de servicio en Git, Android Studio, el APK, el navegador ni un ESP32. No necesitas `google-services.json` ni añadir Firebase Android SDK al contenedor WebView: la comunicación con Firebase se realiza desde el servidor.

Las reglas bloqueadas protegen el acceso directo de los clientes. El Admin SDK del servidor las omite por diseño: por eso `/api/workspace` verifica la sesión, deriva la ruta del usuario autenticado y valida los campos, límites y acciones recibidas.

## 2. Comprobar que realmente sincroniza

1. Abre Gvent con la misma cuenta en dos navegadores o teléfonos.
2. Espera a que ambos indiquen **Firebase conectado**.
3. Cambia la potencia a Low en uno.
4. Comprueba que aparece el mismo porcentaje en el otro en aproximadamente 5 segundos.
5. Recarga ambos: el valor guardado debe mantenerse.
6. En Firebase Console abre la ruta `gasvent/v1/workspaces/` y verifica que existe el nodo de simulación con `schemaVersion`, `revision`, `controls`, `devices` y `events`.
7. Ejecuta la prueba de seguridad de la demo. El servidor fuerza la ventilación al 100 % cuando corresponde, incluso si se intenta enviar un apagado durante la alerta.

Los comandos usan identificadores únicos y escrituras condicionales REST con ETag para no duplicarse al reintentar ni reemplazar accidentalmente los ajustes de otro teléfono.

## 3. Conexión perdida y errores

- **Sin sincronizar · Reintentar** significa que los cambios aún no han sido confirmados por Firebase. Pulsa el indicador para ver el error y reintentar.
- Durante un corte se conserva una cola en memoria. **No es almacenamiento offline duradero**: recargar o cerrar la app antes de sincronizar puede perder los cambios pendientes.
- Si el estado está guardado en Firebase, vuelve a recuperarse al abrir la app.
- La versión de esquema se valida; un formato futuro incompatible no se borra ni se reemplaza automáticamente.
- Revisa la URL de la raíz, los permisos de la cuenta de servicio y que Realtime Database esté creada. No publiques reglas abiertas para resolver un error.
- Un HTTP 5xx, incluido 520, indica que la petición no llegó a completarse correctamente. Comprueba la URL exacta en Firebase Console, la disponibilidad de la base y la salida de red del servidor. No se presenta este resultado como una conexión exitosa ni se confunde con una prueba de sincronización real.
- Cambiar o rotar un secreto ya configurado se hace desde **Make settings → Secrets**, no pegándolo en el chat.

## 4. Organización del código web

| Archivo | Responsabilidad |
|---|---|
| `src/domain/workspace.ts` | Modelo versionado, validación y reglas de la simulación |
| `src/lib/firebase/admin.ts` | Inicialización segura del SDK en servidor |
| `src/lib/firebase/workspace-store.ts` | Lecturas y transacciones en Realtime Database |
| `src/lib/firebase/realtime-store.ts` | Transporte REST, ETag, conflictos y errores de servicio |
| `src/app/(frontend)/api/workspace/route.ts` | API autenticada y campos permitidos |
| `src/components/gasvent/useWorkspace.ts` | Sincronización, cola, estado optimista y reintentos |
| `tests/workspace.test.mjs` | Pruebas de validación, seguridad e idempotencia |

Estos archivos pertenecen al sitio de Figma Make, no a `MainActivity.kt`. El ZIP contiene el contenedor Android y la documentación de Firebase; el servidor continúa alojado en el sitio publicado.

## 5. Evolución hacia ESP32 / Arduino

Antes de conectar hardware:

1. Crea una capa de dispositivos distinta del nodo `simulation`. **No escribas lecturas físicas sobre esta simulación.**
2. Distingue estado **solicitado** (`desired`) de estado **confirmado por el equipo** (`reported`). Encender un botón no demuestra que un motor haya arrancado.
3. Asigna una identidad a cada placa, con permisos restringidos a su dispositivo y una credencial revocable. Nunca compartas la clave Admin entre placas.
4. Define un contrato versionado de telemetría: `deviceId`, secuencia, fecha, gas, temperatura, humedad, estado del ventilador y confirmación de comandos.
5. Añade caducidad de comandos, tiempo de última lectura, detección de desconexión, límites de frecuencia y reconexión con espera progresiva.
6. Decide entre un gateway HTTPS o un broker MQTT con TLS y un adaptador hacia Firebase. MQTT no está incluido en este prototipo.
7. El firmware debe ejecutar las protecciones por sí mismo aunque fallen internet, Firebase o la app.

El temporizador actual pertenece a la simulación y a sus sincronizaciones. No hay un servicio industrial de ejecución en segundo plano ni se garantiza una acción física al vencer.

Para una instalación con gases inflamables necesitas sensores y equipos certificados y una evaluación de seguridad. Esta app, los sensores económicos de prueba y un ventilador convencional no constituyen un sistema de protección real.

## Verificación local del repositorio web

```sh
pnpm install
pnpm run test:workspace
pnpm exec tsc --noEmit
pnpm run android:package
pnpm run android:check
```

La prueba por USB-C y del WebView real se realiza en un teléfono físico. La matriz de herramientas y el estado de compilación están en `COMPATIBILIDAD.md`.

## Estado de verificación de esta entrega

Pasaron las pruebas del dominio, del transporte REST y del paquete Android, además de TypeScript y la compilación de producción. La interfaz se comprobó entre dos sesiones con un transporte controlado, incluidos conflictos, recarga, pruebas de seguridad y reintentos. La compilación Android real y la prueba de animación se detallan en `COMPATIBILIDAD.md`.

La consulta a la base configurada devolvió **HTTP 520** desde el entorno de generación. Por tanto, **no se ha confirmado una escritura/lectura real en tu base Firebase**. Verifica la URL de Realtime Database en Make settings → Secrets, que la base exista y que el servidor pueda acceder a ella. No necesitas abrir las reglas a clientes públicos ni exponer la clave privada para resolverlo.

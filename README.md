# Control de Depósito — PWA

PWA responsive para pedidos de reposición en cuatro depósitos: **Supply depot
FOOD** (`SAN`), **Supply depot MNT** (`SCN`), **Librería** (`LIB`) y
**BLDSRV** (`BLDSRV`). Los identificadores internos se mantienen estables por
compatibilidad con sesiones ya guardadas; lo que ve el usuario son los
nombres de `WAREHOUSE_LABELS` en `src/constants/warehouse.ts`.

## Catálogos

Cada depósito sale de un Excel ("Depot Checklist") con, como mínimo, código,
descripción y `MAX quantity`. El `mínimo` de cada ítem se calculó a partir del
máximo (25%, redondeado al entero más cercano y después al múltiplo de 5 más
cercano — ver "Lógica de pedido"). El orden de los ítems respeta el orden de
fila del Excel original, que ya sigue el orden de bin location. El bin de
cada ítem también se guarda (`bin`, opcional) y se muestra en la tarjeta;
Librería es el único depósito cuyo Excel no trae esa columna.

| Depósito | Archivo | Ítems | Fuente |
| --- | --- | --- | --- |
| Supply depot FOOD (`SAN`) | `src/data/san.json` | 208 | Items-KTC.xlsx (Kitchen Supplies Depot) |
| Supply depot MNT (`SCN`) | `src/data/scn.json` | 35 | Items-MNT.xlsx (Mantenimiento Supply Depot) |
| Librería (`LIB`) | `src/data/lib.json` | 53 | Items-Librería.xlsx |
| BLDSRV (`BLDSRV`) | `src/data/bldsrv.json` | 71 | Items-BLDSRV.xlsx |

**A tener en cuenta en MNT:** muchos repuestos de mantenimiento tienen un
`MAX quantity` muy bajo (1-2 unidades). Con la fórmula del mínimo, **22 de los
35 ítems de MNT quedan con `mínimo = 0`**, así que nunca van a disparar un
pedido automáticamente (es la fórmula funcionando como se definió, no un
bug) — si algún ítem de MNT necesita pedirse igual, hoy no hay forma de
forzarlo desde la app.

## Lógica de pedido

El usuario carga **la cantidad contada físicamente** de cada ítem (no la
cantidad a pedir). La app calcula el pedido sola:

- Se pide un ítem cuando `cantidad contada < mínimo`.
- La cantidad a pedir es `máximo - cantidad contada`.
- Un conteo de `0` es un valor válido (ítem agotado) y se trata igual que
  cualquier otro número — dispara pedido si `0 < mínimo`.
- Ítems con `mínimo = 0` nunca disparan pedido (ningún conteo es menor a 0).

Ver `src/utils/order.ts` (`computeOrderLines`) y sus tests en `tests/order.test.ts`.

## Desarrollo

```bash
npm install
npm run dev
```

## QA

```bash
npm run lint
npm test
npx playwright install
npm run e2e
```

Los tests e2e hacen login real, así que necesitan un usuario que exista de
verdad en el proyecto de Firebase configurado (ver "Autenticación de
usuarios"). Sin esto, se saltean solos en vez de fallar:

```bash
E2E_USERNAME=usuario-de-prueba E2E_PASSWORD=su-contraseña npm run e2e
```

Recomendado: usar un usuario de prueba dedicado (no las cuentas reales del
equipo) para no dejar esas credenciales dando vueltas en configuración de CI.

## Docker

```bash
docker compose up --build
```

## Seguridad

- React escapa texto por defecto.
- Exportación XLSX protege celdas de texto frente a CSV/formula injection.
- CSP y cabeceras de seguridad en Nginx.
- Dependencias fijadas por `package-lock.json` al instalar/commitear.
- No se almacenan precios ni datos financieros.
- Persistencia local únicamente para recuperar la sesión del pedido.
- Acceso protegido por login real (Firebase Authentication, ver
  "Autenticación de usuarios" más abajo) — reemplaza al candado de
  contraseña única que tenía la app antes. Cada persona tiene su propio
  usuario y contraseña; ningún secreto queda en el código fuente del
  cliente, a diferencia del esquema anterior.
- La integración con Google Sheets usa el scope `.../auth/spreadsheets`
  (lectura/escritura de Sheets en general, no solo de la planilla configurada),
  que es el más angosto que ofrece la API de Google para escribir filas. Cada
  usuario otorga ese permiso con su propia cuenta al momento de subir un
  pedido; ningún token ni credencial queda guardado en el código ni en
  `localStorage` más allá del ~1 hora que dura la sesión de ese token en
  memoria.
- Reemplazar la lista de un depósito (ver "Cargar listas de ítems") está
  restringido a rol Administrador/a de verdad, no solo en la interfaz: lo
  aplican las Security Rules de Firestore del lado del servidor. Es la
  primera restricción por rol de esta app que no se puede sortear editando
  el navegador — el resto de los permisos de rol siguen siendo solo de
  interfaz.

## Autenticación de usuarios

El login usa **Firebase Authentication** (proveedor "Email/contraseña"). La
contraseña de cada persona nunca viaja al código del cliente ni se guarda ahí
de ninguna forma — se verifica en el backend de Firebase, fuera del alcance
de cualquiera que inspeccione el sitio. Sin las variables de entorno de abajo
configuradas, la app muestra un aviso de "no configurada" en vez del
formulario de login: **nadie puede entrar**, así que a diferencia de Google
Sheets, esto no es opcional.

### 1. Crear el proyecto de Firebase

1. Entrá a [Firebase Console](https://console.firebase.google.com/) y creá
   un proyecto (podés reutilizar el mismo proyecto de Google Cloud que ya
   creaste para Google Sheets, o uno nuevo — no interfieren entre sí).
2. En "Build" → "Authentication" → "Get started", habilitá el proveedor
   **"Email/Password"** (Sign-in method → Email/Password → Enable).
3. En "Project settings" (el ícono de engranaje) → pestaña "General" → sección
   "Your apps", agregá una **Web app** (ícono `</>`). No hace falta Firebase
   Hosting. Vas a ver un bloque `firebaseConfig` — de ahí salen las variables
   del paso 3.

### 2. Dar de alta a cada usuario

En "Authentication" → pestaña "Users" → "Add user". Firebase pide un email,
pero acá se loguea por **nombre de usuario** — la app arma automáticamente un
email interno con la forma `<usuario en minúscula>@deposito.local` (ver
`USERNAME_DOMAIN` en `src/services/firebase.ts`). Tenés que cargar el usuario
exactamente así para que coincida:

| Nombre de usuario (como lo escribe la persona) | Email a cargar en Firebase |
| --- | --- |
| MFailde | `mfailde@deposito.local` |
| MCascone | `mcascone@deposito.local` |
| GScrosoppi | `gscrosoppi@deposito.local` |

La contraseña de cada uno se carga tal cual en ese mismo formulario de
Firebase — no la documento acá porque este archivo queda en el repositorio;
usá las contraseñas que ya tengan definidas.

### Roles

Cada usuario tiene un rol asignado, visible como un chip junto a su nombre en
la barra superior:

| Usuario | Rol |
| --- | --- |
| MFailde | Administrador/a |
| MCascone | Comprador/a |
| GScrosoppi | Comprador/a |

El nombre "bonito" (`MFailde` en vez de `mfailde`) es puramente cosmético y
vive en `DISPLAY_NAMES` en `src/services/firebase.ts` — si se agrega gente
nueva sin tocar ese mapa, el login sigue funcionando igual, solo que se
muestra el usuario tal cual se escribió.

**El rol en sí ya no es solo informativo**: `Administrador/a` es el único
rol que puede reemplazar la lista de ítems de un depósito (ver "Cargar
listas de ítems (Firestore)" más abajo), y esa restricción la aplica
Firestore del lado del servidor, no la app. El rol de cada persona se
guarda en Firestore, no en el código — ver esa misma sección para cómo
darlo de alta.

### 3. Configurar la app

Copiá del bloque `firebaseConfig` del paso 1 a tu `.env` (mismo archivo que
ya tiene las variables de Google Sheets):

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

`VITE_FIREBASE_API_KEY` **no es secreta** aunque el nombre confunda: es un
identificador público del proyecto, pensado para viajar en el código del
cliente (así lo documenta Google) — la seguridad real la da Firebase
Authentication verificando del lado del servidor, no que esta clave esté
oculta. Igual que con Google Sheets, hay que recompilar (`docker compose up
--build` o `npm run build`) después de cambiar el `.env`.

### Sesión

A diferencia del candado anterior (que pedía la contraseña de nuevo en cada
sesión del navegador), el login ahora **persiste** — una vez logueado, la
persona sigue logueada hasta que toque "Cerrar sesión" (ícono en la barra
superior) o borre los datos del sitio. Pensado para un dispositivo de uso
personal; en un dispositivo compartido entre varias personas, conviene cerrar
sesión al terminar.

## Cargar listas de ítems (Firestore)

Un Administrador/a puede subir un Excel de "Depot Checklist" desde la app
(ícono de carga en la barra superior) para reemplazar la lista de un
depósito, sin tocar código ni redesplegar. Usa **Cloud Firestore**, en el
mismo proyecto de Firebase que ya creaste para el login — no hace falta otra
cuenta ni otro servicio.

### Cómo funciona

- La app sigue arrancando siempre con los 4 catálogos incluidos en el build
  (instantáneo, funciona offline). Si algún administrador reemplazó la lista
  de un depósito en algún momento, la versión de Firestore la reemplaza en
  cuanto llega la respuesta — sin conexión, se sigue viendo la del build.
- Al elegir un Excel, la app detecta automáticamente a qué depósito
  corresponde por el texto de la columna "Depot" (mismo criterio que usamos
  para tus 4 archivos originales), pero el administrador puede cambiarlo
  manualmente antes de confirmar.
- El mínimo se recalcula con la misma fórmula que ya usamos (25% del máximo →
  redondeo estándar → múltiplo de 5 más cercano) y el bin se toma tal cual de
  la columna "Bin location", sin ninguna transformación.
- Si el archivo subido es **idéntico** (ítem por ítem, mismo orden) al que ya
  está cargado para ese depósito, la app avisa que no hay nada para
  reemplazar y no deja confirmar. Si es distinto, muestra un botón
  "Confirmar y reemplazar".

### 1. Habilitar Firestore

En Firebase Console → menú lateral → "Build" → "Firestore Database" →
"Create database". Elegí modo de producción (no "test mode") y cualquier
región — no importa para este volumen de datos. **No hace falta ninguna
variable de entorno nueva**: usa la misma configuración de Firebase que ya
cargaste para el login.

### 2. Cargar las reglas de seguridad

En Firestore → pestaña "Rules", reemplazá el contenido por esto y publicá:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function usernameFromEmail() {
      return request.auth.token.email.split('@')[0];
    }

    function myRole() {
      return get(/databases/$(database)/documents/roles/$(usernameFromEmail())).data.role;
    }

    match /roles/{userId} {
      allow read: if isSignedIn();
      allow write: if false; // el rol se carga a mano desde la consola, nunca desde la app
    }

    match /catalogs/{warehouseId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && myRole() == 'Administrador/a';
    }
  }
}
```

Esto es lo que hace que "solo Administrador/a puede reemplazar una lista" sea
una restricción real: la verifica Firestore, no el navegador. Cualquier otro
usuario logueado que intente escribir en `catalogs` — sea desde el botón (que
ni siquiera le aparece) o manipulando la app directamente — recibe un
rechazo del servidor.

### 3. Cargar el rol de cada persona

En Firestore → pestaña "Data" → "Start collection" → ID de colección:
`roles`. Por cada persona, un documento con **ID igual al nombre de usuario
en minúscula** (mismo valor que usaste como email al crear la cuenta, sin el
`@deposito.local`) y un campo:

| Documento (ID) | Campo `role` (string) |
| --- | --- |
| `mfailde` | `Administrador/a` |
| `mcascone` | `Comprador/a` |
| `gscrosoppi` | `Comprador/a` |

Si en el futuro cambia el rol de alguien, se edita ese campo directamente en
la consola — no hace falta redesplegar la app.

## Notas UX

- Un ítem por vez mediante una tarjeta deslizante: derecha = cargar lo
  contado, izquierda = omitir el ítem sin registrar conteo.
- Administrador/a puede cargar una lista nueva por depósito desde la app
  (ícono de carga en la barra superior) — ver "Cargar listas de ítems".
- Botón "Atrás" para volver al ítem anterior sin perder el conteo ya
  cargado. Si se vuelve a abrir el modal de cantidad para un ítem ya
  contado, el campo aparece precargado con ese valor — "Cancelar" deja el
  conteo como estaba, "Confirmar" lo actualiza.
- La tarjeta muestra el bin (ubicación física) del ítem cuando el depósito
  lo tiene cargado. Librería no trae bin en su Excel de origen, así que ahí
  nunca se muestra.
- El pedido (qué se pide y cuánto) se calcula solo — ver "Lógica de pedido".
- Búsqueda por código/nombre.
- Progreso.
- Modo oscuro.
- Responsive mobile/tablet/desktop.
- Persistencia con Zustand + localStorage (clave `warehouse-count-session`).
- Exportación `Pedido_<slug>_Fecha.xlsx` (`FOOD`/`MNT`/`LIB`/`BLDSRV`, ver `WAREHOUSE_FILE_SLUGS`).
- PWA offline mediante service worker.

## Integración con Google Sheets

Además de descargar el Excel, el resumen final puede subirse a una Google Sheet
compartida (botón "Subir a Google Sheets"). Cada usuario inicia sesión con su
propia cuenta de Google — no hay backend ni credenciales secretas en el
código; por eso cada persona necesita permiso de edición sobre la planilla.

Si no se configuran las variables de entorno de abajo, el botón simplemente no
aparece: el resto de la app sigue funcionando igual.

### 1. Crear el proyecto y el OAuth Client ID en Google Cloud

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) y creá un
   proyecto (o usá uno existente).
2. En "APIs & Services" → "Library", buscá y **habilitá "Google Sheets API"**.
3. En "APIs & Services" → "OAuth consent screen":
   - Tipo de usuario: **External** (o **Internal** si todos los usuarios están
     en el mismo Google Workspace).
   - En la pestaña **Test users**, agregá el email de Google de cada persona
     que va a usar la app. Mientras la app quede en modo "Testing" y todos los
     usuarios estén en esa lista, no aparece la pantalla de advertencia
     "Google no verificó esta app" — no hace falta pasar por el proceso de
     verificación de Google para un uso interno con pocos usuarios.
4. En "APIs & Services" → "Credentials" → "Create Credentials" → **"OAuth
   client ID"**:
   - Tipo de aplicación: **Web application**.
   - En "Authorized JavaScript origins", agregá el/los dominios donde se sirve
     la app (ej. `https://deposito.tuempresa.com`, y `http://localhost:5173`
     si vas a probar en desarrollo).
   - Guardá el **Client ID** generado (no hace falta el "client secret": las
     apps web públicas no lo usan).

### 2. Crear la Google Sheet

1. Creá una planilla nueva y renombrá una pestaña a `Pedidos` (o el nombre que
   prefieras, mientras coincida con `VITE_GOOGLE_SHEET_RANGE`).
2. En la fila 1, opcionalmente agregá encabezados: `Fecha`, `Depósito`,
   `Código`, `Nombre`, `Cantidad` (la app agrega filas nuevas debajo, nunca
   sobreescribe lo existente).
3. Compartí la planilla con permiso de **Editor** a cada persona que vaya a
   usar la app (o a un Google Group que los incluya a todos).
4. Copiá el **ID de la planilla**: es la parte de la URL entre `/d/` y
   `/edit`, por ejemplo en
   `https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit`
   el ID es `1AbCdEfGhIjKlMnOpQrStUvWxYz`.

### 3. Configurar la app

Copiá `.env.example` a `.env` y completá:

```bash
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
VITE_GOOGLE_SHEET_RANGE=Pedidos!A1
```

Con Docker Compose, el mismo archivo `.env` en la raíz del proyecto se usa
automáticamente como *build args* (ver `docker-compose.yml`):

```bash
docker compose up --build
```

Si compilás sin Docker, `npm run build` toma las variables del `.env`
directamente (Vite las inyecta en tiempo de build, no de arranque — si las
cambiás, hay que recompilar).

## Robustez (slide / búsqueda)

- `ErrorBoundary` global: cualquier excepción no controlada muestra una pantalla
  de recuperación en vez de dejar la app en blanco, y no borra el pedido en curso
  (el store sigue persistido en `localStorage`).
- El gesto de deslizar (`ItemCard`) descarta multitouch, protege `setPointerCapture`
  con `try/catch`, evita doble disparo del mismo swipe y limpia sus timers al
  desmontar o cambiar de ítem (usa `key={item.codigo}` para resetear su estado
  interno de forma limpia entre tarjetas).
- La búsqueda sin resultados ya no deja la pantalla en blanco: muestra un aviso
  y un botón para limpiar el filtro. El índice de la tarjeta actual se
  recalcula si queda fuera de rango (por ejemplo, tras restaurar una sesión
  vieja) en lugar de intentar renderizar un ítem inexistente.
- `QuantityModal` usa `disableScrollLock` en el `Dialog` de MUI: se observó en
  un celular real que, con el modal abierto, el contenido de fondo se
  comprimía en una columna angosta (texto partido letra por letra). La
  hipótesis es que el cálculo de compensación de scrollbar de MUI se rompe en
  ese navegador y aplica un `padding-right` excesivo al `<body>`;
  `disableScrollLock` evita que MUI toque esos estilos. Sin confirmar en más
  dispositivos todavía.

# MusicYA — API REST y Realtime

API de la plataforma MusicYA para contratar artistas (cumbia, rock, etc.) en Cusco:
perfiles de artistas, reservas con control de agenda, pagos por QR, chat en tiempo real,
notificaciones y recomendaciones.

- **Stack:** Node.js · Express 5 · Socket.IO · Supabase (PostgreSQL)
- **Auth:** JWT propio (no Supabase Auth) · contraseñas con bcrypt
- **Base URL:** `http://localhost:4000`

---

## Puesta en marcha

```bash
cd backend
npm install
npm run dev      # desarrollo con recarga (nodemon)
npm start        # producción
```

### Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | ✅* | `service_role` key (omite RLS; uso del backend) |
| `SUPABASE_ANON_KEY` | — | Respaldo; respeta RLS |
| `JWT_SECRET` | recomendada | Secreto para firmar JWT (default `dev_secret`) |
| `JWT_EXPIRES_IN` | — | Expiración del token (default `7d`) |
| `PORT` | — | Puerto del servidor (default `4000`) |
| `CLIENT_ORIGIN` | — | Origen permitido para CORS (default `*`) |

\* El backend usa `SUPABASE_SERVICE_KEY`; si solo hay `SUPABASE_ANON_KEY`, las consultas respetan RLS y pueden bloquearse.

### Base de datos

El esquema está en [`src/db/schema.sql`](src/db/schema.sql). Ejecútalo en el **SQL Editor**
de Supabase. Es idempotente e incluye las migraciones incrementales.

---

## Convenciones

### Autenticación

Las rutas protegidas requieren un JWT en la cabecera:

```
Authorization: Bearer <token>
```

El token se obtiene de `POST /api/auth/register` o `POST /api/auth/login`.

### Roles

- **`cliente`** — contrata artistas, paga, califica, chatea.
- **`artista`** — gestiona su perfil y portafolio, confirma/finaliza reservas.
- **`admin`** — solo asignable manualmente en la BD (no por registro).

### Formato de errores

Todas las respuestas de error tienen la forma:

```json
{ "message": "Descripción del error" }
```

| Código | Significado |
|:------:|-------------|
| `400` | Datos inválidos o faltantes |
| `401` | Token ausente, inválido o credenciales incorrectas |
| `403` | Autenticado pero sin permiso (rol o propiedad) |
| `404` | Recurso no encontrado |
| `409` | Conflicto (duplicado, solapamiento de agenda, estado ya aplicado) |
| `500` | Error interno |

---

## Índice de endpoints

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|:----:|-----|-------------|
| GET  | `/` | — | — | Healthcheck |
| POST | `/api/auth/register` | — | — | Registro (cliente/artista) |
| POST | `/api/auth/login` | — | — | Inicio de sesión |
| GET  | `/api/auth/me` | ✅ | — | Usuario autenticado |
| GET  | `/api/artists` | — | — | Listar artistas (con filtros) |
| GET  | `/api/artists/:id` | — | — | Perfil + portafolio + calificaciones |
| POST | `/api/artists` | ✅ | artista | Crear perfil profesional |
| PUT  | `/api/artists/:id` | ✅ | artista (dueño) | Actualizar perfil + portafolio |
| POST | `/api/artists/:id/ratings` | ✅ | — | Calificar a un artista |
| GET  | `/api/search` | — | — | Búsqueda con filtros, orden y paginación |
| GET  | `/api/search/nearby` | — | — | Búsqueda geolocalizada (Haversine) |
| GET  | `/api/bookings` | ✅ | — | Mis reservas |
| POST | `/api/bookings` | ✅ | — | Crear reserva |
| GET  | `/api/bookings/availability` | — | — | Disponibilidad por rango |
| PATCH| `/api/bookings/:id/status` | ✅ | participante | Cambiar estado |
| POST | `/api/payments/:bookingId/qr` | ✅ | cliente | Generar QR de pago |
| POST | `/api/payments/:bookingId/confirm` | ✅ | cliente | Confirmar pago |
| GET  | `/api/chat` | ✅ | — | Mis conversaciones |
| POST | `/api/chat` | ✅ | — | Iniciar conversación |
| POST | `/api/chat/bot` | ✅ | — | Chatbot de ayuda |
| GET  | `/api/chat/:conversationId/messages` | ✅ | participante | Historial |
| POST | `/api/chat/:conversationId/messages` | ✅ | participante | Enviar mensaje |
| GET  | `/api/notifications` | ✅ | — | Listar notificaciones |
| PATCH| `/api/notifications/read-all` | ✅ | — | Marcar todas como leídas |
| PATCH| `/api/notifications/:id/read` | ✅ | — | Marcar una como leída |
| GET  | `/api/recommendations` | ✅ | — | Recomendaciones |
| GET  | `/api/recommendations/history` | ✅ | — | Historial de contrataciones |

---

## Auth

### `POST /api/auth/register`

Registra un usuario. Si `role` es `artista`, además crea su perfil profesional
(con *rollback* si la creación del perfil falla).

**Body**

| Campo | Tipo | Req. | Notas |
|-------|------|:----:|-------|
| `name` | string | ✅ | |
| `email` | string | ✅ | se normaliza a minúsculas |
| `password` | string | ✅ | mínimo 6 caracteres |
| `role` | `cliente`\|`artista` | — | default `cliente` |
| `phone` | string | — | |
| `genre`, `bio`, `hourly_rate`, `city` | — | — | solo si `role=artista` |

```json
// 201 Created
{
  "user": {
    "id": 1, "name": "DJ Ana", "email": "ana@mail.com", "role": "artista", "phone": null,
    "artist_profile": { "id": 1, "genre": "Rock", "bio": null, "hourly_rate": 150, "city": "Cusco", "is_available": true }
  },
  "token": "eyJhbGciOiJI..."
}
```

Errores: `400` (datos inválidos / rol no permitido), `409` (correo ya registrado).

### `POST /api/auth/login`

**Body:** `{ "email", "password" }` → `200 { user, token }`. Credenciales incorrectas → `401`.

### `GET /api/auth/me`  · 🔒

Devuelve el usuario del token. Si es artista, incluye `artist_profile`.

---

## Artists

### `GET /api/artists`

Lista artistas ordenados por calificación. **Query (opcional):** `genre`, `city`, `available` (`true`/`false`).

### `GET /api/artists/:id`

Perfil con datos de contacto, `portfolio[]` y `ratings[]` (con autor). `404` si no existe.

### `POST /api/artists`  · 🔒 artista

Crea el perfil profesional del artista autenticado. **Body:** `genre`, `bio`, `hourly_rate`,
`city`, `lat`, `lng`, `portfolio[]` (`{ type: imagen|video|audio, url, title }`).
`409` si ya tiene perfil (usar `PUT`).

### `PUT /api/artists/:id`  · 🔒 artista (dueño)

Actualización parcial (solo campos enviados). Si llega `portfolio[]`, **reemplaza** el portafolio.
`403` si el perfil no es del usuario.

### `POST /api/artists/:id/ratings`  · 🔒

Califica a un artista y recalcula su promedio. **Body:** `{ score: 1-5, comment? }`.
No puedes calificarte a ti mismo (`403`). `score` fuera de rango → `400`.

```json
// 201 Created
{ "rating": { "id": 1, "score": 5, "comment": "Excelente", "created_at": "..." }, "rating_avg": 5 }
```

---

## Search

### `GET /api/search`

Búsqueda de artistas con filtros combinables, ordenamiento y paginación.

**Query (todos opcionales)**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `genre` | string | Coincidencia parcial de género (ilike) |
| `city` | string | Coincidencia parcial de ciudad (ilike) |
| `available` | `true`\|`false` | Filtra por disponibilidad |
| `minRate` / `maxRate` | number | Rango de tarifa por hora |
| `minRating` | number | Calificación promedio mínima |
| `q` | string | Texto libre sobre género, ciudad y bio |
| `sort` | `rating`\|`price_asc`\|`price_desc` | Orden (default `rating`) |
| `limit` | number | Resultados por página (default `20`, máx `50`) |
| `offset` | number | Desplazamiento para paginar (default `0`) |

```json
{
  "count": 4, "limit": 20, "offset": 0,
  "results": [ { "id": 16, "genre": "Rock", "city": "Lima", "hourly_rate": 300, "rating_avg": 5, "is_available": true, "users": { "name": "Rock Lima" } } ]
}
```

`count` es el total de coincidencias (para paginar); `results` solo la página solicitada.

### `GET /api/search/nearby`

Búsqueda geolocalizada por distancia (Haversine, vía función SQL `artists_nearby`).

**Query:** `lat` ✅, `lng` ✅, `radiusKm` (default `10`), `genre` (opcional), `available` (opcional).
Devuelve artistas dentro del radio ordenados por `distance_km`, aplicando los filtros opcionales
sobre el resultado. Falta `lat`/`lng` → `400`.

---

## Bookings

Estados (`booking_status`): `pendiente` → `confirmada` → `pagada` → `finalizada`, o `cancelada`.

### `GET /api/bookings`  · 🔒

Reservas del usuario: si es **cliente**, las que hizo; si es **artista**, las recibidas.
Incluye datos del artista y del cliente.

### `POST /api/bookings`  · 🔒

Crea una reserva en estado `pendiente` y notifica al artista.

**Body**

| Campo | Tipo | Req. | Notas |
|-------|------|:----:|-------|
| `artistId` | number | ✅ | id de `artist_profiles` |
| `event_date` | ISO datetime | ✅ | inicio; debe ser **futuro** |
| `event_end` | ISO datetime | — | fin del evento |
| `duration_minutes` | number | — | usado si no hay `event_end` (default `120`) |
| `event_type` | string | — | |
| `location` | string | — | |
| `total` | number | — | |

**Control de agenda:** el rango `[event_date, event_end)` no puede **solaparse** con otra
reserva activa del mismo artista. Reservas que se tocan en el borde (una termina cuando empieza
la otra) **no** son conflicto.

Errores: `400` (fecha inválida/pasada, `event_end` ≤ inicio), `404` (artista), `409` (solapamiento),
`400` (reservarte a ti mismo).

### `GET /api/bookings/availability`

Comprueba disponibilidad de un artista en un rango. Público.

**Query:** `artistId` ✅, `date` ✅ (inicio), `end` o `duration_minutes` (default `120`).

```json
{ "artistId": 4, "start": "...T18:00:00.000Z", "end": "...T20:00:00.000Z", "available": true }
```

### `PATCH /api/bookings/:id/status`  · 🔒 participante

Cambia el estado. Solo el cliente o el artista de la reserva. Transiciones por rol:

- **cliente:** `cancelada`
- **artista:** `confirmada`, `cancelada`, `finalizada`

`pagada` no se asigna aquí (lo hace el flujo de pagos). Notifica a la contraparte.
`403` si no participa o la transición no está permitida para su rol.

---

## Payments

Pagos por QR (MVP sin pasarela bancaria; el comprobante se valida manualmente).

### `POST /api/payments/:bookingId/qr`  · 🔒 cliente

Genera un QR (dataURL) con el monto de la reserva. Reutiliza el pago pendiente si ya existe
(idempotente). El monto se toma de `bookings.total`.

```json
{ "booking_id": 2, "payment_id": 1, "amount": 350, "qr": "data:image/png;base64,..." }
```

Errores: `403` (no eres el cliente), `409` (ya pagada), `400` (reserva cancelada/finalizada o sin monto).

### `POST /api/payments/:bookingId/confirm`  · 🔒 cliente

Confirma el pago: marca el pago `pagado`, la reserva `pagada`, guarda el comprobante y
notifica al artista. **Body:** `{ receipt_url? }`. Requiere haber generado el QR antes (`400`).

```json
{ "booking": { "id": 2, "status": "pagada", "total": 350 },
  "payment": { "id": 1, "amount": 350, "status": "pagado", "receipt_url": "https://..." } }
```

---

## Chat

### `GET /api/chat`  · 🔒

Conversaciones del usuario (como cliente o artista), con nombres embebidos.

### `POST /api/chat`  · 🔒

Inicia (o recupera) la conversación con un artista. **Body:** `{ artistId }`.
*Get-or-create*: una sola conversación por par cliente-artista. No contigo mismo (`400`).

### `GET /api/chat/:conversationId/messages`  · 🔒 participante

Historial en orden cronológico, con autor. `403` si no participas.

### `POST /api/chat/:conversationId/messages`  · 🔒 participante

Envía y persiste un mensaje. **Body:** `{ body }`. Vacío → `400`, no participante → `403`.

### `POST /api/chat/bot`  · 🔒

Chatbot por palabras clave (reservas, pagos, tarifas, cancelaciones, registro de artista).
**Body:** `{ message }` → `{ reply }`.

---

## Notifications

### `GET /api/notifications`  · 🔒

Lista (máx. 50, recientes primero) con contador de no leídas. **Query:** `unread=true` filtra solo no leídas.

```json
{ "unread_count": 2, "notifications": [ { "id": 9, "title": "...", "body": "...", "is_read": false, "created_at": "..." } ] }
```

### `PATCH /api/notifications/read-all`  · 🔒

Marca todas las no leídas como leídas → `{ "updated": 3 }`.

### `PATCH /api/notifications/:id/read`  · 🔒

Marca una como leída (solo si es del usuario). `404` si no existe o es ajena.

---

## Recommendations

### `GET /api/recommendations`  · 🔒

Recomienda artistas según el historial del usuario (*content-based* por género), excluyendo los
ya contratados. Sin historial: cae a los mejor calificados (*cold start*).

```json
{ "basis": "genre_history", "preferred_genres": ["Rock"], "recommendations": [ { "id": 10, "genre": "Rock", "rating_avg": 5, "users": { "name": "Rock Dos" } } ] }
```

`basis` puede ser `genre_history` o `top_rated`.

### `GET /api/recommendations/history`  · 🔒

Historial de contrataciones del usuario (como cliente o artista), recientes primero →
`{ count, history[] }`.

---

## Realtime (Socket.IO)

El servidor de WebSocket corre en la misma URL (`http://localhost:4000`).

### Handshake autenticado

La conexión **requiere un JWT válido**, igual que la API REST. Se pasa en `auth.token`:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', { auth: { token: jwtDelLogin } });
```

Sin token o con token inválido, la conexión se rechaza (`connect_error`). Al conectar, el usuario
se une automáticamente a su sala personal `user:<id>` para recibir notificaciones.

### Eventos

| Dirección | Evento | Payload | Descripción |
|-----------|--------|---------|-------------|
| → emitir | `chat:join` | `conversationId` | Une a la sala del chat (solo si participas) |
| → emitir | `chat:message` | `{ conversationId, body }` | Envía mensaje (el remitente sale del JWT) |
| ← recibir | `chat:message` | `{ id, conversation_id, sender_id, body, created_at }` | Mensaje nuevo en la sala |
| ← recibir | `notification:new` | `{ id, title, body, is_read, created_at }` | Notificación en tiempo real |
| ← recibir | `chat:error` | `{ message }` | Error (no participas, mensaje vacío, etc.) |

> **Seguridad:** el `sender_id` de los mensajes siempre proviene del JWT del socket, nunca del
> payload del cliente (a prueba de *spoofing*). Las notificaciones se **persisten y se emiten**
> a través de un único punto (`createNotification`).

---

## Estado de implementación

| Módulo | Estado |
|--------|:------:|
| auth, artists, search, bookings, payments, chat, notifications, recommendations | ✅ Completo |

Todos los controladores están implementados y verificados contra Supabase. Endurecimiento
aplicado: handshake de Socket.IO autenticado con JWT, notificaciones centralizadas
(persistencia + tiempo real) y control de solapamiento de reservas por rango horario..

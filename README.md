# MusicYA

Plataforma web y móvil inteligente para la **contratación y promoción de artistas
musicales en tiempo real**. Proyecto de tesis — Escuela Profesional de Ingeniería
Informática y de Sistemas, UNSAAC.

> Permite conectar **clientes** y **músicos** mediante búsqueda inteligente,
> geolocalización, disponibilidad en tiempo real, mensajería instantánea y gestión
> digital de contrataciones (MVP).

## Arquitectura (monorepo)

```
MusicYA/
├── backend/     API REST + tiempo real  (Node.js · Express · Supabase/PostgreSQL · Socket.io)
└── mobile/      App móvil y web          (Expo · React Native · TypeScript)
```

## Módulos (mapeo con los objetivos específicos del plan)

| Objetivo del plan | Módulo backend | Pantallas móvil |
|---|---|---|
| Perfiles profesionales (portafolio, multimedia, calificaciones) | `artists` | Perfil / Portafolio |
| Búsqueda por geolocalización, filtros y disponibilidad en tiempo real | `search` | Búsqueda / Mapa |
| Chatbot, notificaciones y coordinación de eventos | `chat`, `notifications` | Chat |
| Reservas, validación de disponibilidad y pagos con QR | `bookings`, `payments` | Reservas / Pago QR |
| Recomendaciones inteligentes e historial | `recommendations` | Inicio / Historial |

## Puesta en marcha

### Backend
```bash
cd backend
cp .env.example .env      # configura SUPABASE_URL, SUPABASE_ANON_KEY y JWT
npm install
# crea las tablas: pega src/db/schema.sql en el SQL Editor de Supabase
npm run dev               # http://localhost:4000
```

### Móvil (Expo)
```bash
cd mobile
npm install
npm start                 # abre Expo: pulsa a (Android), w (web), i (iOS)
```

## Tecnologías
- **Backend:** Node.js, Express, Supabase (PostgreSQL, `@supabase/supabase-js`), JWT, Socket.io, QRCode.
- **Móvil/Web:** Expo, React Native, TypeScript.
- **Metodología:** Scrum (desarrollo iterativo del MVP).

## Seguridad (modelo de acceso a datos)

- El **backend** se conecta a Supabase con la **service_role key**, que omite RLS.
  La autorización de negocio se aplica en la API (JWT + middlewares de rol).
  Esta key es secreta y **solo se usa en el servidor**, nunca en el cliente/móvil.
- **Row Level Security (RLS)** está activado en todas las tablas como defensa en
  profundidad. Con la `anon key` solo se pueden **leer** los datos públicos de
  promoción (perfiles de artistas, portafolio y calificaciones); el resto
  (usuarios, reservas, pagos, mensajes, notificaciones) queda bloqueado.
- Las políticas están documentadas al final de `backend/src/db/schema.sql`.

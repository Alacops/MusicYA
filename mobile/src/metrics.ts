import { api } from './api/client';

// Instrumentación de la hipótesis Lean Startup: mide la eficiencia de búsqueda y
// contratación. Una "sesión" arranca cuando el usuario empieza a buscar (t0) y sus
// eventos (artista abierto, solicitud enviada) se registran con el tiempo transcurrido
// desde t0, de modo que el backend pueda calcular el tiempo medio para encontrar un
// artista, la tasa de éxito y la tasa de solicitud.

let sessionId: string | null = null;
let startedAt = 0;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Envía un evento sin bloquear la UI ni propagar errores (las métricas nunca deben
// romper el flujo del usuario).
function send(event_type: string, extra: Record<string, unknown> = {}): void {
  if (!sessionId) return;
  const payload = { session_id: sessionId, event_type, elapsed_ms: Date.now() - startedAt, ...extra };
  api.post('/metrics/event', payload).catch(() => {});
}

// Inicia una nueva sesión de búsqueda (t0). Se llama al montar el Home.
export function startSearchSession(filters?: unknown): void {
  sessionId = newId();
  startedAt = Date.now();
  send('search_started', { filters });
}

export function recordFilterApplied(filters: unknown): void {
  send('filter_applied', { filters });
}

// El usuario encontró un candidato y abrió su perfil (elapsed = tiempo hasta encontrar).
export function recordArtistOpened(artistId: number): void {
  send('artist_opened', { artist_id: artistId });
}

// El usuario inició una solicitud de contratación.
export function recordRequestInitiated(artistId: number): void {
  send('request_initiated', { artist_id: artistId });
}

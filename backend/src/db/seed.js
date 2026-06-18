// Datos de prueba para MusicYA.
// Crea usuarios con credenciales conocidas y puebla las tablas principales.
// Es IDEMPOTENTE: borra primero los registros de seed por correo (cascade) y
// los vuelve a crear, así puedes ejecutarlo las veces que quieras.
//
//   Uso:  npm run seed   (desde la carpeta backend)
//
// Credenciales generadas (contraseña común): 123456
//   - Cliente: test@cliente.com
//   - Artista: test@artista.com
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const PASSWORD = '123456';

// Todos los artistas en CUSCO, con coordenadas reales de distintos barrios para
// que se distribuyan en el mapa en tiempo real (búsqueda geolocalizada Haversine).
const ARTISTS = [
  {
    email: 'test@artista.com',
    name: 'Artista Prueba',
    genre: 'Cumbia',
    city: 'Cusco',
    hourly_rate: 150,
    bio: 'Orquesta de cumbia y salsa para bodas, fiestas y aniversarios.',
    lat: -13.5163, // Plaza de Armas
    lng: -71.9785,
    portfolio: [
      { type: 'audio', url: 'https://demo.musicya/cumbia-en-vivo.mp3', title: 'En vivo' },
      { type: 'imagen', url: 'https://demo.musicya/banda.jpg', title: 'La banda' },
    ],
  },
  {
    email: 'ana.rock@artista.com',
    name: 'Ana Rock',
    genre: 'Rock',
    city: 'Cusco',
    hourly_rate: 200,
    bio: 'Banda de rock en español e inglés para eventos privados.',
    lat: -13.5283, // Wanchaq
    lng: -71.9558,
    portfolio: [{ type: 'video', url: 'https://demo.musicya/rock-clip.mp4', title: 'Demo en vivo' }],
  },
  {
    email: 'luis.folk@artista.com',
    name: 'Luis Folklore',
    genre: 'Folklore Andino',
    city: 'Cusco',
    hourly_rate: 180,
    bio: 'Música andina tradicional: zampoña, charango y quena.',
    lat: -13.5145, // San Blas
    lng: -71.9737,
    portfolio: [{ type: 'audio', url: 'https://demo.musicya/quena.mp3', title: 'Solo de quena' }],
  },
  {
    email: 'dj.beat@artista.com',
    name: 'DJ Beat',
    genre: 'Electrónica',
    city: 'Cusco',
    hourly_rate: 250,
    bio: 'DJ de electrónica y house para discotecas y fiestas.',
    lat: -13.5238, // Av. de la Cultura (Magisterio)
    lng: -71.9430,
    portfolio: [],
  },
];

// Inserta y devuelve la fila, lanzando si hay error
async function insertOne(table, payload, cols = 'id') {
  const { data, error } = await supabase.from(table).insert(payload).select(cols).single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

function futureDay(daysAhead, hourUTC) {
  const d = new Date(Date.now() + daysAhead * 86400000);
  d.setUTCHours(hourUTC, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Generando datos de prueba…');
  const hash = await bcrypt.hash(PASSWORD, 10);
  const seedEmails = ['test@cliente.com', ...ARTISTS.map((a) => a.email)];

  // 1) Limpieza idempotente (cascade borra perfiles, reservas, etc.).
  // Borra los correos del seed y cualquier cuenta demo/de prueba anterior, para
  // dejar un dataset consistente y 100% de Cusco.
  let removed = 0;
  for (const filter of [
    (q) => q.in('email', seedEmails),
    (q) => q.like('email', '%@musicya.pe'),
    (q) => q.like('email', '%@test.com'),
  ]) {
    const { data } = await filter(supabase.from('users').delete()).select('id');
    removed += data ? data.length : 0;
  }
  console.log(`  limpieza: ${removed} usuario(s) demo/de prueba previos eliminados`);

  // 2) Cliente de prueba
  const client = await insertOne('users', {
    name: 'Cliente Prueba',
    email: 'test@cliente.com',
    password_hash: hash,
    role: 'cliente',
    phone: '+51 999 111 222',
  });

  // 3) Artistas + perfiles + portafolio
  const profiles = [];
  for (const a of ARTISTS) {
    const u = await insertOne('users', {
      name: a.name,
      email: a.email,
      password_hash: hash,
      role: 'artista',
    });
    const p = await insertOne('artist_profiles', {
      user_id: u.id,
      genre: a.genre,
      city: a.city,
      hourly_rate: a.hourly_rate,
      bio: a.bio,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      is_available: a.is_available ?? true,
    });
    if (a.portfolio && a.portfolio.length) {
      const { error } = await supabase
        .from('portfolio_items')
        .insert(a.portfolio.map((it) => ({ artist_id: p.id, ...it })));
      if (error) throw new Error(`portfolio_items: ${error.message}`);
    }
    profiles.push({ ...a, userId: u.id, profileId: p.id });
  }

  // 4) Calificaciones del cliente + recálculo de rating_avg
  const ratingPlan = [
    { i: 0, score: 4, comment: 'Muy buenos, animaron toda la fiesta.' },
    { i: 1, score: 5, comment: 'Excelente energía en vivo.' },
    { i: 2, score: 5, comment: 'Auténtico folklore, recomendado.' },
    { i: 3, score: 3, comment: 'Buen DJ, algo corto el set.' },
  ];
  for (const r of ratingPlan) {
    const pr = profiles[r.i];
    const { error } = await supabase
      .from('ratings')
      .insert({ artist_id: pr.profileId, client_id: client.id, score: r.score, comment: r.comment });
    if (error) throw new Error(`ratings: ${error.message}`);
  }
  for (const pr of profiles) {
    const { data: rows } = await supabase.from('ratings').select('score').eq('artist_id', pr.profileId);
    const avg = rows.length ? rows.reduce((s, x) => s + x.score, 0) / rows.length : 0;
    await supabase.from('artist_profiles').update({ rating_avg: avg.toFixed(2) }).eq('id', pr.profileId);
  }

  // 5) Reservas en distintos estados (fechas futuras, rango de 2 horas)
  async function makeBooking(pr, eventType, daysAhead, status, total) {
    const start = futureDay(daysAhead, 20);
    const end = new Date(start.getTime() + 2 * 3600000);
    return insertOne('bookings', {
      client_id: client.id,
      artist_id: pr.profileId,
      event_type: eventType,
      event_date: start.toISOString(),
      event_end: end.toISOString(),
      location: pr.city,
      status,
      total,
    });
  }
  const bPend = await makeBooking(profiles[0], 'Boda', 10, 'pendiente', 300);
  await makeBooking(profiles[1], 'Concierto privado', 15, 'confirmada', 400);
  const bPaid = await makeBooking(profiles[2], 'Aniversario', 20, 'pagada', 360);

  // 6) Pago de la reserva pagada
  await insertOne('payments', {
    booking_id: bPaid.id,
    method: 'qr',
    amount: 360,
    status: 'pagado',
    receipt_url: 'https://demo.musicya/comprobante.png',
  });

  // 7) Notificaciones
  // Nota: en un insert en lote, todas las filas deben declarar las mismas claves;
  // si se omite is_read en algunas, PostgREST inserta NULL (no el default false).
  const { error: notifErr } = await supabase.from('notifications').insert([
    { user_id: profiles[0].userId, title: 'Nueva solicitud de reserva', body: 'Cliente Prueba quiere contratarte para una Boda.', is_read: false },
    { user_id: client.id, title: 'Reserva confirmada', body: 'Tu reserva de Concierto privado fue confirmada.', is_read: false },
    { user_id: client.id, title: 'Pago recibido', body: 'Se confirmó el pago de tu reserva de Aniversario.', is_read: true },
  ]);
  if (notifErr) throw new Error(`notifications: ${notifErr.message}`);

  // 8) Conversación + mensajes (cliente ↔ Ana Rock)
  const conv = await insertOne('conversations', {
    client_id: client.id,
    artist_id: profiles[1].profileId,
  });
  const { error: msgErr } = await supabase.from('messages').insert([
    { conversation_id: conv.id, sender_id: client.id, body: 'Hola, ¿están libres el sábado?' },
    { conversation_id: conv.id, sender_id: profiles[1].userId, body: '¡Hola! Sí, con gusto. ¿A qué hora?' },
  ]);
  if (msgErr) throw new Error(`messages: ${msgErr.message}`);

  // Resumen
  console.log('\n✓ Datos de prueba creados (todos en Cusco):');
  console.log(`  - 1 cliente + ${profiles.length} artistas (contraseña: ${PASSWORD})`);
  console.log('  - 4 calificaciones, 4 items de portafolio');
  console.log('  - 3 reservas (pendiente / confirmada / pagada) + 1 pago');
  console.log('  - 3 notificaciones, 1 conversación con 2 mensajes');
  console.log('\nCredenciales de acceso:');
  console.log('  CLIENTE  ->  test@cliente.com  /  ' + PASSWORD);
  console.log('  ARTISTA  ->  test@artista.com  /  ' + PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ Error en el seed:', err.message);
    process.exit(1);
  });

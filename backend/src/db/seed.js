// Datos de prueba para MusicYA.
// Crea usuarios con credenciales conocidas y puebla las tablas principales.
// Es IDEMPOTENTE: borra primero los registros de seed por correo (cascade) y
// los vuelve a crear, así puedes ejecutarlo las veces que quieras.
//
//   Uso:  npm run seed   (desde la carpeta backend)
//
// Credenciales generadas (contraseña común): 123456
//   - Cliente: cliente@musicya.com
//   - Artista: artista@musicya.com
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const PASSWORD = '123456';

// Clientes de prueba (el primero es el "cliente principal" con historial completo;
// el resto existen para poder iniciar sesión y probar el flujo de contratación).
const CLIENTS = [
  { email: 'cliente@musicya.com', name: 'Cliente Prueba', phone: '+51 999 111 222' },
  { email: 'rosa.mendoza@musicya.com', name: 'Rosa Mendoza', phone: '+51 984 222 333' },
  { email: 'carlos.quispe@musicya.com', name: 'Carlos Quispe', phone: '+51 984 333 444' },
  { email: 'lucia.torres@musicya.com', name: 'Lucía Torres', phone: '+51 984 444 555' },
  { email: 'jorge.flores@musicya.com', name: 'Jorge Flores', phone: '+51 984 555 666' },
];

// Medios de demostración (stock público y fiable). El usuario puede reemplazarlos
// luego por sus URLs reales desde "Mi portafolio" en la app.
//   - Avatares: i.pravatar.cc (fotos de rostro)
//   - Imágenes: picsum.photos (fotos con semilla estable)
//   - Videos:   gtv-videos-bucket de Google (mp4 con reproducción directa)
//   - Audio:    SoundHelix (mp3 de muestra)
const VID = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const img = (seed) => `https://picsum.photos/seed/${seed}/800/600`;
const avatar = (n) => `https://i.pravatar.cc/300?img=${n}`;
const audio = (n) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

// Todos los artistas en CUSCO, con coordenadas reales de distintos barrios para
// que se distribuyan en el mapa en tiempo real (búsqueda geolocalizada Haversine).
// demoScore = nota que el cliente principal les deja en la reserva finalizada.
const ARTISTS = [
  {
    email: 'artista@musicya.com',
    name: 'Artista Prueba',
    genre: 'Cumbia',
    city: 'Cusco',
    hourly_rate: 150,
    bio: 'Orquesta de cumbia y salsa para bodas, fiestas y aniversarios.',
    lat: -13.5163, // Plaza de Armas
    lng: -71.9785,
    verified: true,
    demoScore: 4,
    avatar_url: avatar(12),
    social: { instagram: '@artistaprueba', youtube: 'Artista Prueba' },
    doc: 'https://demo.musicya/doc-artista-prueba.pdf',
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerJoyrides.mp4`, title: 'Cumbia en vivo' },
      { type: 'imagen', url: img('cumbia-banda'), title: 'La banda' },
      { type: 'audio', url: audio(1), title: 'En vivo' },
    ],
  },
  {
    email: 'ana.rock@musicya.com',
    name: 'Ana Rock',
    genre: 'Rock',
    city: 'Cusco',
    hourly_rate: 200,
    bio: 'Banda de rock en español e inglés para eventos privados.',
    lat: -13.5283, // Wanchaq
    lng: -71.9558,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(5),
    social: { instagram: '@anarock' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerBlazes.mp4`, title: 'Demo en vivo' },
      { type: 'imagen', url: img('rock-show'), title: 'En el escenario' },
    ],
  },
  {
    email: 'luis.folk@musicya.com',
    name: 'Luis Folklore',
    genre: 'Folklore Andino',
    city: 'Cusco',
    hourly_rate: 180,
    bio: 'Música andina tradicional: zampoña, charango y quena.',
    lat: -13.5145, // San Blas
    lng: -71.9737,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(13),
    doc: 'https://demo.musicya/doc-luis-folk.pdf',
    portfolio: [
      { type: 'imagen', url: img('andes-quena'), title: 'Presentación en San Blas' },
      { type: 'audio', url: audio(3), title: 'Solo de quena' },
    ],
  },
  {
    email: 'dj.beat@musicya.com',
    name: 'DJ Beat',
    genre: 'Electrónica',
    city: 'Cusco',
    hourly_rate: 250,
    bio: 'DJ de electrónica y house para discotecas y fiestas.',
    lat: -13.5238, // Av. de la Cultura (Magisterio)
    lng: -71.9430,
    verified: false, // sin verificar: tendrá 1 respaldo (1/2) para demostrar el flujo
    demoScore: 3,
    avatar_url: avatar(15),
    social: { instagram: '@djbeat', tiktok: '@djbeatcusco' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerFun.mp4`, title: 'Set en vivo' },
      { type: 'imagen', url: img('dj-lights'), title: 'Fiesta electrónica' },
    ],
  },
  {
    email: 'mariachi.sol@musicya.com',
    name: 'Mariachi Sol de Cusco',
    genre: 'Mariachi',
    city: 'Cusco',
    hourly_rate: 300,
    bio: 'Mariachi tradicional para serenatas, bodas y aniversarios.',
    lat: -13.5195, // Santiago
    lng: -71.9680,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(52),
    social: { instagram: '@mariachisolcusco' },
    doc: 'https://demo.musicya/doc-mariachi-sol.pdf',
    portfolio: [
      { type: 'imagen', url: img('mariachi'), title: 'Serenata' },
      { type: 'video', url: `${VID}/ForBiggerMeltdowns.mp4`, title: 'Boda en vivo' },
      { type: 'audio', url: audio(5), title: 'Serenata' },
    ],
  },
  {
    email: 'valentina.rios@musicya.com',
    name: 'Valentina Ríos',
    genre: 'Cantante / Pop',
    city: 'Cusco',
    hourly_rate: 220,
    bio: 'Cantante solista de pop y baladas para eventos y ceremonias.',
    lat: -13.5320, // Ttio
    lng: -71.9490,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(45),
    social: { instagram: '@valentinariosmusic', tiktok: '@valeriosmusic' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerEscapes.mp4`, title: 'En vivo' },
      { type: 'imagen', url: img('singer-pop'), title: 'Ceremonia' },
    ],
  },
  {
    email: 'miguel.trompeta@musicya.com',
    name: 'Miguel Ángel Trompeta',
    genre: 'Trompetista',
    city: 'Cusco',
    hourly_rate: 160,
    bio: 'Trompetista para orquestas, misas, desfiles y eventos corporativos.',
    lat: -13.5100, // San Cristóbal
    lng: -71.9820,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(53),
    social: { instagram: '@migueltrompeta' },
    portfolio: [
      { type: 'imagen', url: img('trumpet'), title: 'Desfile' },
      { type: 'audio', url: audio(7), title: 'Solo de trompeta' },
    ],
  },
  {
    email: 'showkids@musicya.com',
    name: 'Show Kids Cusco',
    genre: 'Animación infantil',
    city: 'Cusco',
    hourly_rate: 140,
    bio: 'Animadores para fiestas infantiles: juegos, magia y globoflexia.',
    lat: -13.5350, // Larapa
    lng: -71.9600,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(60),
    social: { instagram: '@showkidscusco', tiktok: '@showkidscusco' },
    portfolio: [
      { type: 'imagen', url: img('kids-party'), title: 'Fiesta infantil' },
      { type: 'video', url: `${VID}/ForBiggerJoyrides.mp4`, title: 'Show de globos' },
    ],
  },
  {
    email: 'sabor.latino@musicya.com',
    name: 'Grupo Sabor Latino',
    genre: 'Salsa',
    city: 'Cusco',
    hourly_rate: 280,
    bio: 'Orquesta de salsa y timba para fiestas y matrimonios.',
    lat: -13.5260, // Centro
    lng: -71.9700,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(33),
    social: { instagram: '@saborlatinocusco' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerBlazes.mp4`, title: 'Salsa en vivo' },
      { type: 'imagen', url: img('salsa-band'), title: 'Matrimonio' },
    ],
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
  const seedEmails = [...CLIENTS.map((c) => c.email), ...ARTISTS.map((a) => a.email)];

  // 1) Limpieza idempotente (cascade borra perfiles, reservas, etc.).
  // Borra los correos del seed y cualquier cuenta demo/de prueba anterior
  // (incluidos los dominios de seeds previos), para dejar un dataset consistente.
  let removed = 0;
  for (const filter of [
    (q) => q.in('email', seedEmails),
    (q) => q.like('email', '%@artista.com'), // seeds anteriores
    (q) => q.like('email', '%@cliente.com'), // seeds anteriores
    (q) => q.like('email', '%@musicya.pe'),
    (q) => q.like('email', '%@test.com'),
  ]) {
    const { data } = await filter(supabase.from('users').delete()).select('id');
    removed += data ? data.length : 0;
  }
  console.log(`  limpieza: ${removed} usuario(s) demo/de prueba previos eliminados`);

  // 2) Clientes de prueba (el primero es el principal, con historial completo)
  const clients = [];
  for (const c of CLIENTS) {
    const cu = await insertOne('users', {
      name: c.name,
      email: c.email,
      password_hash: hash,
      role: 'cliente',
      phone: c.phone || null,
    });
    clients.push(cu);
  }
  const client = clients[0];

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
      is_verified: a.verified === true,
      verified_at: a.verified === true ? new Date().toISOString() : null,
      avatar_url: a.avatar_url || null,
      social_links: a.social || null,
      verification_doc_url: a.doc || null,
      // 60 días de antigüedad: cuentas consolidadas que cumplen el requisito de
      // antigüedad para poder VOTAR la verificación de otros artistas.
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    });
    if (a.portfolio && a.portfolio.length) {
      const { error } = await supabase
        .from('portfolio_items')
        .insert(a.portfolio.map((it) => ({ artist_id: p.id, ...it })));
      if (error) throw new Error(`portfolio_items: ${error.message}`);
    }
    profiles.push({ ...a, userId: u.id, profileId: p.id });
  }

  // 3b) Respaldo comunitario de demo: un artista verificado avala a DJ Beat
  //     (queda en 1/2, para mostrar el flujo de verificación en la app).
  {
    const endorser = profiles[2]; // Luis Folklore (verificado)
    const target = profiles[3]; // DJ Beat (sin verificar)
    const { error } = await supabase.from('artist_endorsements').insert({
      artist_id: target.profileId,
      endorser_id: endorser.profileId,
      comment: 'Lo vi tocar en vivo, es auténtico.',
    });
    if (error) throw new Error(`artist_endorsements: ${error.message}`);
  }

  // 4) Reservas (rango de 2 horas). daysOffset negativo = evento en el pasado.
  async function makeBooking(pr, eventType, daysOffset, status, total) {
    const start = futureDay(daysOffset, 20);
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
  // Futuras: muestran el flujo activo (pendiente / confirmada / pagada)
  await makeBooking(profiles[0], 'Boda', 10, 'pendiente', 300);
  await makeBooking(profiles[1], 'Concierto privado', 15, 'confirmada', 400);
  const bPaid = await makeBooking(profiles[2], 'Aniversario', 20, 'pagada', 360);

  // Pasadas y FINALIZADAS: habilitan la calificación bilateral y aportan
  // "contrataciones reales" (requisito para votar la verificación).
  const finished = [];
  for (let i = 0; i < profiles.length; i++) {
    const fb = await makeBooking(profiles[i], 'Evento privado', -(15 + i), 'finalizada', 300);
    finished.push({ bookingId: fb.id, artistUserId: profiles[i].userId, score: profiles[i].demoScore });
  }

  // 5) Reseñas BILATERALES sobre las reservas finalizadas (cliente ↔ artista)
  const reviewRows = [];
  for (const f of finished) {
    reviewRows.push({
      booking_id: f.bookingId,
      rater_id: client.id,
      ratee_id: f.artistUserId,
      ratee_role: 'artista',
      score: f.score,
      comment: 'Gran presentación, cumplió lo acordado.',
    });
    reviewRows.push({
      booking_id: f.bookingId,
      rater_id: f.artistUserId,
      ratee_id: client.id,
      ratee_role: 'cliente',
      score: 5,
      comment: 'Cliente puntual y con todo claro.',
    });
  }
  {
    const { error } = await supabase.from('reviews').insert(reviewRows);
    if (error) throw new Error(`reviews: ${error.message}`);
  }

  // 5b) Recalcular promedios desde reviews: rating_avg (artistas), reputation_avg (cliente)
  for (const pr of profiles) {
    const { data: rows } = await supabase
      .from('reviews').select('score').eq('ratee_id', pr.userId).eq('ratee_role', 'artista');
    const avg = rows.length ? rows.reduce((s, x) => s + x.score, 0) / rows.length : 0;
    await supabase.from('artist_profiles').update({ rating_avg: avg.toFixed(2) }).eq('id', pr.profileId);
  }
  {
    const { data: rows } = await supabase
      .from('reviews').select('score').eq('ratee_id', client.id).eq('ratee_role', 'cliente');
    const avg = rows.length ? rows.reduce((s, x) => s + x.score, 0) / rows.length : 0;
    await supabase.from('users').update({ reputation_avg: avg.toFixed(2) }).eq('id', client.id);
  }

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
  console.log(`  - ${clients.length} clientes + ${profiles.length} artistas (contraseña: ${PASSWORD})`);
  console.log('  - reseñas bilaterales sobre reservas finalizadas + portafolio por artista');
  console.log(`  - reservas: 3 activas (pendiente/confirmada/pagada) + ${profiles.length} finalizadas + 1 pago`);
  console.log('  - 3 notificaciones, 1 conversación con 2 mensajes');
  console.log('  - artistas verificados aptos para votar; DJ Beat con 1/2 respaldos (sin verificar)');
  console.log('\nCredenciales de acceso (contraseña: ' + PASSWORD + '):');
  console.log('  CLIENTE  ->  cliente@musicya.com');
  console.log('  ARTISTA  ->  artista@musicya.com');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ Error en el seed:', err.message);
    process.exit(1);
  });

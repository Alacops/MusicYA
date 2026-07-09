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
    district: 'Cusco (Centro)',
    event_types: ['Bodas', 'Fiestas privadas'],
    hourly_rate: 150,
    bio: 'Orquesta de cumbia y salsa con más de 10 años animando bodas, fiestas patronales y aniversarios en todo Cusco. Contamos con seis músicos en vivo, equipo de sonido e iluminación propios, y un repertorio que va desde la cumbia clásica peruana hasta los éxitos del momento. Nos adaptamos a la duración y el estilo de tu evento para que la pista no pare de bailar. Atendemos Cusco y provincias cercanas, coordinamos el repertorio contigo con anticipación y ofrecemos paquetes por horas según lo que necesites.',
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
    district: 'Wanchaq',
    event_types: ['Conciertos', 'Fiestas privadas'],
    hourly_rate: 200,
    bio: 'Banda de rock en español e inglés ideal para eventos privados, bares y festivales. Nuestro repertorio recorre desde clásicos de los 80 y 90 hasta rock actual, siempre con energía y una puesta en escena cuidada. Incluimos voz, dos guitarras, bajo y batería, y podemos preparar canciones especiales a pedido para tu celebración. Tenemos experiencia en bares, matrimonios y festivales, llevamos nuestro propio backline y hacemos una prueba de sonido previa para que todo salga perfecto.',
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
    district: 'Cusco (Centro)',
    event_types: ['Bodas', 'Eventos culturales'],
    hourly_rate: 180,
    bio: 'Conjunto de música andina tradicional con zampoña, charango, quena y percusión, dedicado a preservar el folklore cusqueño. Amenizamos matrimonios, ceremonias, recepciones turísticas y actos culturales con un repertorio auténtico de huaynos, sikuris y música de los Andes. Vestimos trajes típicos y ofrecemos también fusiones contemporáneas para públicos de todas las edades. Ideal para eventos con visitantes que buscan una experiencia cultural genuina; nos acomodamos a ceremonias íntimas o presentaciones de escenario.',
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
    district: 'San Sebastián',
    event_types: ['Fiestas privadas', 'Conciertos'],
    hourly_rate: 250,
    bio: 'DJ de electrónica, house y open format para discotecas, after parties y fiestas privadas. Mezclo en vivo leyendo a la pista para mantener la energía toda la noche, con transiciones limpias y un set que combina hits y sonidos underground. Llevo controladora, cabina e iluminación LED, y armo el ambiente perfecto según el tipo de evento. Puedo incluir humo, cañón de luces y micrófono para animación, y preparo una lista personalizada con los géneros que prefieras.',
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
    district: 'Santiago',
    event_types: ['Serenatas', 'Bodas'],
    hourly_rate: 300,
    bio: 'Mariachi tradicional para serenatas, bodas, cumpleaños y aniversarios, con trajes de gala y trompetas, violines y guitarrón en vivo. Interpretamos los clásicos de la música mexicana y peruana que emocionan en cualquier ocasión, y preparamos serenatas sorpresa a la hora que necesites. Puntualidad y una presentación impecable garantizadas. Ofrecemos paquetes de canciones a elección, nos desplazamos a cualquier distrito de Cusco y coordinamos la hora exacta para que la sorpresa sea perfecta.',
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
    district: 'Wanchaq',
    event_types: ['Bodas', 'Eventos corporativos'],
    hourly_rate: 220,
    bio: 'Cantante solista de pop y baladas para bodas, ceremonias y eventos corporativos, con voz versátil en español e inglés. Acompaño mis presentaciones con pistas profesionales o guitarra en vivo, creando momentos íntimos para el primer baile o la entrada de los novios. Personalizo el repertorio a tu historia para que cada canción tenga un significado especial. Trabajo con ensayo previo, aporto mi propio equipo de audio para grupos pequeños y me adapto tanto a ceremonias religiosas como a recepciones y after office.',
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
    district: 'Cusco (Centro)',
    event_types: ['Eventos corporativos', 'Conciertos'],
    hourly_rate: 160,
    bio: 'Trompetista profesional con formación en conservatorio, disponible para orquestas, misas, desfiles cívicos y eventos corporativos. Aporto un sonido cálido y potente tanto en repertorio clásico y sacro como en cumbia, salsa y música popular. Trabajo como solista o refuerzo de otras agrupaciones, y me integro con facilidad al formato que tu evento requiera. Cuento con repertorio para protocolo, honores y música bailable, y tengo disponibilidad para presentaciones dentro y fuera de la ciudad.',
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
    district: 'San Jerónimo',
    event_types: ['Fiestas infantiles'],
    hourly_rate: 140,
    bio: 'Equipo de animación para fiestas infantiles con juegos, concursos, show de magia, globoflexia y personajes favoritos de los niños. Nos encargamos de mantener a los pequeños entretenidos y seguros mientras los papás disfrutan, con dinámicas adaptadas a cada edad. Incluimos sonido, premios y toda la energía para que el cumpleaños sea inolvidable. Contamos con animadores certificados en primeros auxilios, materiales desinfectados y paquetes de 1 a 3 horas según el número de niños.',
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
    district: 'Cusco (Centro)',
    event_types: ['Bodas', 'Eventos corporativos', 'Fiestas privadas'],
    hourly_rate: 280,
    bio: 'Orquesta de salsa y timba con sección completa de metales, coros y percusión afrocaribeña para fiestas, matrimonios y eventos empresariales. Traemos el sabor del Caribe a Cusco con un show bailable de principio a fin y clásicos de la salsa brava y romántica. Contamos con equipo profesional de sonido y podemos incluir animación para llenar la pista toda la noche. Ofrecemos formato orquesta completa o versión reducida según tu presupuesto, y coordinamos horarios flexibles para eventos que se extienden hasta la madrugada.',
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
  {
    email: 'sofia.jazz@musicya.com',
    name: 'Sofía Jazz Trío',
    genre: 'Jazz',
    city: 'Cusco',
    district: 'Wanchaq',
    event_types: ['Eventos corporativos', 'Bodas'],
    hourly_rate: 240,
    bio: 'Trío de jazz elegante (voz, piano y contrabajo) para cocteles, cenas de gala y recepciones corporativas. Creamos una atmósfera sofisticada con estándares del jazz, bossa nova y baladas suaves, ideal para ambientar sin robar protagonismo a tu evento. Ajustamos volumen y repertorio al momento, desde el aperitivo hasta el brindis final.',
    lat: -13.5292,
    lng: -71.9520,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(48),
    social: { instagram: '@sofiajazztrio' },
    portfolio: [
      { type: 'imagen', url: img('jazz-trio'), title: 'Cena de gala' },
      { type: 'audio', url: audio(2), title: 'Estándar de jazz' },
    ],
  },
  {
    email: 'andinos.sur@musicya.com',
    name: 'Los Andinos del Sur',
    genre: 'Folklore Andino',
    city: 'Cusco',
    district: 'Santiago',
    event_types: ['Eventos culturales', 'Bodas'],
    hourly_rate: 190,
    bio: 'Agrupación de música andina con quena, zampoña, charango y percusión, con amplia experiencia en recepciones turísticas, matrimonios y actos institucionales. Vestimos trajes típicos y ofrecemos un repertorio que combina huaynos, sikuris y fusiones modernas para todo público.',
    lat: -13.5231,
    lng: -71.9722,
    verified: true,
    demoScore: 4,
    avatar_url: avatar(11),
    social: { instagram: '@andinosdelsur' },
    doc: 'https://demo.musicya/doc-andinos-sur.pdf',
    portfolio: [
      { type: 'imagen', url: img('andes-charango'), title: 'Recepción turística' },
      { type: 'audio', url: audio(4), title: 'Huayno en vivo' },
    ],
  },
  {
    email: 'dj.nova@musicya.com',
    name: 'DJ Nova',
    genre: 'Reggaetón',
    city: 'Cusco',
    district: 'San Sebastián',
    event_types: ['Fiestas privadas', 'Quinceañeros'],
    hourly_rate: 230,
    bio: 'DJ de reggaetón, urbano y hits del momento para quinceañeros, promociones y fiestas privadas. Mezclo en vivo con cabina, luces LED y humo, y armo la lista con tus canciones favoritas para que la pista no pare. Incluyo micrófono para animación y hora loca.',
    lat: -13.5331,
    lng: -71.9205,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(14),
    social: { instagram: '@djnovacusco', tiktok: '@djnova' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerFun.mp4`, title: 'Fiesta urbana' },
      { type: 'imagen', url: img('dj-neon'), title: 'Quinceañero' },
    ],
  },
  {
    email: 'camila.pop@musicya.com',
    name: 'Camila Baladas',
    genre: 'Cantante / Pop',
    city: 'Cusco',
    district: 'Cusco (Centro)',
    event_types: ['Bodas', 'Serenatas'],
    hourly_rate: 210,
    bio: 'Cantante solista de baladas y pop romántico para bodas, serenatas y ceremonias. Acompaño con pista o guitarra en vivo y personalizo las canciones para el primer baile o la entrada de los novios. Voz versátil en español e inglés, con ensayo previo para que cada momento sea perfecto.',
    lat: -13.5178,
    lng: -71.9781,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(20),
    social: { instagram: '@camilabaladas' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerEscapes.mp4`, title: 'Primer baile' },
      { type: 'imagen', url: img('singer-ballad'), title: 'Ceremonia' },
    ],
  },
  {
    email: 'sinfonica.qosqo@musicya.com',
    name: 'Banda Sinfónica Qosqo',
    genre: 'Orquesta',
    city: 'Cusco',
    district: 'Cusco (Centro)',
    event_types: ['Eventos corporativos', 'Conciertos'],
    hourly_rate: 320,
    bio: 'Ensamble orquestal para conciertos, protocolos, aniversarios institucionales y eventos corporativos de gran formato. Contamos con sección de cuerdas, vientos y percusión, repertorio de honores y música bailable, y capacidad para adaptarnos a escenarios grandes con equipo profesional.',
    lat: -13.5155,
    lng: -71.9805,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(51),
    social: { instagram: '@sinfonicaqosqo' },
    doc: 'https://demo.musicya/doc-sinfonica-qosqo.pdf',
    portfolio: [
      { type: 'imagen', url: img('orchestra'), title: 'Concierto' },
      { type: 'video', url: `${VID}/ForBiggerMeltdowns.mp4`, title: 'Protocolo institucional' },
    ],
  },
  {
    email: 'trio.romance@musicya.com',
    name: 'Trío Romance',
    genre: 'Bolero',
    city: 'Cusco',
    district: 'San Jerónimo',
    event_types: ['Serenatas', 'Aniversarios'],
    hourly_rate: 170,
    bio: 'Trío de boleros y música criolla con guitarras y voces para serenatas, aniversarios de bodas y reuniones íntimas. Interpretamos los clásicos románticos que emocionan a cualquier generación, con presentación impecable y disponibilidad para serenatas sorpresa a la hora que elijas.',
    lat: -13.5482,
    lng: -71.8885,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(59),
    social: { instagram: '@trioromancecusco' },
    portfolio: [
      { type: 'imagen', url: img('bolero-trio'), title: 'Serenata' },
      { type: 'audio', url: audio(6), title: 'Bolero clásico' },
    ],
  },
  {
    email: 'rock.nacion@musicya.com',
    name: 'Rock Nación',
    genre: 'Rock',
    city: 'Cusco',
    district: 'Wanchaq',
    event_types: ['Conciertos', 'Fiestas privadas'],
    hourly_rate: 205,
    bio: 'Banda de rock en español para bares, festivales y fiestas privadas, con un show enérgico que recorre clásicos del rock latino y covers actuales. Voz, guitarras, bajo y batería con backline propio y prueba de sonido previa. Preparamos temas a pedido para tu evento.',
    lat: -13.5305,
    lng: -71.9535,
    verified: false,
    demoScore: 3,
    avatar_url: avatar(56),
    social: { instagram: '@rocknacioncusco', tiktok: '@rocknacion' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerBlazes.mp4`, title: 'En vivo' },
      { type: 'imagen', url: img('rock-band'), title: 'Festival' },
    ],
  },
  {
    email: 'illary.cuerdas@musicya.com',
    name: 'Cuarteto Illary',
    genre: 'Música clásica',
    city: 'Cusco',
    district: 'Cusco (Centro)',
    event_types: ['Bodas', 'Misas'],
    hourly_rate: 260,
    bio: 'Cuarteto de cuerdas (dos violines, viola y cello) para ceremonias religiosas, bodas y eventos protocolares. Ofrecemos un repertorio elegante que va del clásico a arreglos modernos para la entrada de los novios, la firma y el brindis. Presentación formal y coordinación previa del programa musical.',
    lat: -13.5162,
    lng: -71.9772,
    verified: true,
    demoScore: 5,
    avatar_url: avatar(32),
    social: { instagram: '@cuartetoillary' },
    doc: 'https://demo.musicya/doc-cuarteto-illary.pdf',
    portfolio: [
      { type: 'imagen', url: img('string-quartet'), title: 'Boda en catedral' },
      { type: 'audio', url: audio(8), title: 'Cuerdas en vivo' },
    ],
  },
  {
    email: 'dj.andina@musicya.com',
    name: 'DJ Andina',
    genre: 'Electrónica',
    city: 'Cusco',
    district: 'Poroy',
    event_types: ['Fiestas privadas', 'Conciertos'],
    hourly_rate: 245,
    bio: 'DJ de electrónica y open format con fusiones de música andina, ideal para eventos con identidad cusqueña, after parties y fiestas temáticas. Mezclo en vivo leyendo la pista, con cabina, iluminación y set personalizado que combina hits globales con sonidos locales.',
    lat: -13.4872,
    lng: -72.0468,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(44),
    social: { instagram: '@djandina', tiktok: '@djandina' },
    portfolio: [
      { type: 'video', url: `${VID}/ForBiggerJoyrides.mp4`, title: 'Set andino-electrónico' },
      { type: 'imagen', url: img('dj-andes'), title: 'Fiesta temática' },
    ],
  },
  {
    email: 'payasitos.fiesta@musicya.com',
    name: 'Payasitos Fiesta',
    genre: 'Animación infantil',
    city: 'Cusco',
    district: 'Saylla',
    event_types: ['Fiestas infantiles'],
    hourly_rate: 130,
    bio: 'Show de payasos para fiestas infantiles con humor, juegos, concursos, globoflexia y burbujas gigantes. Mantenemos a los niños felices y participativos con dinámicas por edades, premios y mucha energía. Incluimos sonido propio y paquetes de 1 a 3 horas según el número de invitados.',
    lat: -13.5622,
    lng: -71.8338,
    verified: false,
    demoScore: 4,
    avatar_url: avatar(65),
    social: { instagram: '@payasitosfiesta', tiktok: '@payasitosfiesta' },
    portfolio: [
      { type: 'imagen', url: img('clown-party'), title: 'Cumpleaños' },
      { type: 'video', url: `${VID}/ForBiggerFun.mp4`, title: 'Show de burbujas' },
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
      district: a.district ?? null,
      event_types: a.event_types ?? null,
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

  // 3b) Respaldos comunitarios: cada artista VERIFICADO muestra quiénes lo
  //     respaldaron (mínimo 3 artistas verificados). DJ Beat queda en 2/3 —
  //     "aún por verificar"— para exhibir el flujo de verificación en la app.
  {
    const verifiedProfiles = profiles.filter((p) => p.verified === true);
    const ENDORSE_COMMENTS = [
      'Toca increíble, lo recomiendo totalmente.',
      'Lo vi en vivo, es 100% auténtico.',
      'Gran profesional, cumple con lo que promete.',
      'Excelente calidad y muy responsable.',
      'Un artista de confianza, respaldo su trabajo.',
    ];
    // Un artista no puede respaldarse a sí mismo: se toman otros verificados.
    const pickEndorsers = (target, n) =>
      verifiedProfiles.filter((p) => p.profileId !== target.profileId).slice(0, n);

    const endorseRows = [];
    let ci = 0;
    for (const target of verifiedProfiles) {
      for (const endorser of pickEndorsers(target, 3)) {
        endorseRows.push({
          artist_id: target.profileId,
          endorser_id: endorser.profileId,
          comment: ENDORSE_COMMENTS[ci++ % ENDORSE_COMMENTS.length],
        });
      }
    }
    // DJ Beat (sin verificar): 2 respaldos → 2/3
    for (const endorser of pickEndorsers(profiles[3], 2)) {
      endorseRows.push({
        artist_id: profiles[3].profileId,
        endorser_id: endorser.profileId,
        comment: ENDORSE_COMMENTS[ci++ % ENDORSE_COMMENTS.length],
      });
    }
    const { error } = await supabase.from('artist_endorsements').insert(endorseRows);
    if (error) throw new Error(`artist_endorsements: ${error.message}`);
  }

  // 4) Reservas (rango de 2 horas). daysOffset negativo = evento en el pasado.
  async function makeBooking(pr, eventType, daysOffset, status, total, clientId = client.id) {
    const start = futureDay(daysOffset, 20);
    const end = new Date(start.getTime() + 2 * 3600000);
    return insertOne('bookings', {
      client_id: clientId,
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

  // 5b) Reseñas ADICIONALES de otros clientes: varios ejemplos por artista, con
  //     textos y notas variados. Cada reseña necesita su reserva finalizada.
  //     - A los VERIFICADOS solo se les añaden notas 4–5 para no bajar su
  //       reputación por debajo de 4.0 (requisito para poder votar la verificación).
  //     - A los NO verificados se les permite alguna nota media (más realista).
  const REVIEWS_HI = [
    { score: 5, comment: 'Excelente, superó nuestras expectativas. Muy recomendado.' },
    { score: 5, comment: 'Puntual, profesional y con un sonido increíble.' },
    { score: 4, comment: 'Muy buena presentación, el público quedó feliz.' },
    { score: 5, comment: 'Ambiente espectacular, lo volveríamos a contratar sin dudar.' },
    { score: 4, comment: 'Gran repertorio y buena energía toda la noche.' },
    { score: 5, comment: 'Hizo que la fiesta fuera inolvidable. ¡Gracias!' },
  ];
  const REVIEWS_MIX = [
    { score: 4, comment: 'Buen show, cumplió con lo acordado.' },
    { score: 3, comment: 'Estuvo bien, aunque empezó un poco tarde.' },
    { score: 5, comment: 'Nos encantó, muy amable y profesional.' },
    { score: 4, comment: 'Buena música, el equipo de sonido a la altura.' },
    { score: 3, comment: 'Correcto en general, mejoraría la comunicación previa.' },
    { score: 4, comment: 'Amenizó muy bien el evento, contentos con el servicio.' },
  ];
  const otherClients = clients.slice(1); // 4 clientes adicionales
  const EXTRA_PER_ARTIST = 3;
  for (let i = 0; i < profiles.length; i++) {
    const pr = profiles[i];
    const pool = pr.verified === true ? REVIEWS_HI : REVIEWS_MIX;
    for (let k = 0; k < EXTRA_PER_ARTIST; k++) {
      const reviewer = otherClients[(i + k) % otherClients.length];
      const sample = pool[(i * EXTRA_PER_ARTIST + k) % pool.length];
      const fb = await makeBooking(
        pr, 'Evento privado', -(40 + i * EXTRA_PER_ARTIST + k), 'finalizada', 300, reviewer.id
      );
      reviewRows.push({
        booking_id: fb.id,
        rater_id: reviewer.id,
        ratee_id: pr.userId,
        ratee_role: 'artista',
        score: sample.score,
        comment: sample.comment,
      });
    }
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
  console.log('  - reseñas bilaterales + varias reseñas por artista (de distintos clientes)');
  console.log(`  - reservas: 3 activas (pendiente/confirmada/pagada) + ${profiles.length} finalizadas + 1 pago`);
  console.log('  - 3 notificaciones, 1 conversación con 2 mensajes');
  console.log('  - verificados con ≥3 respaldos visibles; DJ Beat con 2/3 (aún por verificar)');
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

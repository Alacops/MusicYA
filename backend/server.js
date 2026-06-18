require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSockets } = require('./src/sockets');
const { supabase } = require('./src/config/supabase');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Servicios en tiempo real (chat, notificaciones, disponibilidad)
initSockets(server);

async function start() {
  try {
    // Verifica la conexión a Supabase antes de aceptar tráfico
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Conexión a Supabase establecida');
  } catch (err) {
    console.warn('⚠ No se pudo conectar a Supabase:', err.message);
    console.warn('  El servidor arrancará igual; revisa SUPABASE_URL y SUPABASE_ANON_KEY en .env');
  }

  server.listen(PORT, () => {
    console.log(`✓ MusicYA API escuchando en http://localhost:${PORT}`);
  });
}

start();

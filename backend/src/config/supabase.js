const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

// El backend usa la service_role key por defecto: omite las políticas RLS y
// actúa como intermediario de confianza (la autenticación la maneja nuestro
// propio JWT). La anon key queda como respaldo y respeta RLS.
const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠ SUPABASE_URL o una key (SERVICE/ANON) no están configuradas en .env');
} else if (!serviceKey) {
  console.warn('⚠ Usando SUPABASE_ANON_KEY: las consultas respetan RLS y pueden bloquearse.');
  console.warn('  Para el backend se recomienda configurar SUPABASE_SERVICE_KEY.');
}

const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'public-anon-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = { supabase };

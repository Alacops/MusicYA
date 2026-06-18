const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Roles que un usuario puede AUTOASIGNARSE al registrarse desde la app.
// 'admin' queda excluido a propósito: solo se asigna manualmente en la BD.
const SELF_ASSIGNABLE_ROLES = ['cliente', 'artista'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Normaliza el correo para evitar duplicados por mayúsculas/espacios
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, password, phone, role = 'cliente' } = req.body;
    const email = normalizeEmail(req.body.email);

    // --- Validación de entrada ---
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email y password son obligatorios' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'El formato del correo no es válido' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: "El rol debe ser 'cliente' o 'artista'" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // --- 1) Crear el usuario base ---
    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash, role, phone: phone || null })
      .select('id, name, email, role, phone')
      .single();

    if (error) {
      // 23505 = unique_violation en PostgreSQL (correo ya registrado)
      if (error.code === '23505') {
        return res.status(409).json({ message: 'El correo ya está registrado' });
      }
      return next(error);
    }

    // --- 2) Si es artista, crear su perfil profesional vinculado ---
    let artistProfile = null;
    if (role === 'artista') {
      const { genre, bio, hourly_rate, city } = req.body;
      const { data: profile, error: profileError } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: user.id,
          genre: genre || null,
          bio: bio || null,
          hourly_rate: hourly_rate ?? null,
          city: city || 'Cusco',
        })
        .select('id, genre, bio, hourly_rate, city, is_available')
        .single();

      if (profileError) {
        // Rollback manual: evitamos dejar un usuario artista sin perfil
        await supabase.from('users').delete().eq('id', user.id);
        return next(profileError);
      }
      artistProfile = profile;
    }

    res.status(201).json({
      user: artistProfile ? { ...user, artist_profile: artistProfile } : user,
      token: signToken(user),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email y password son obligatorios' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) return next(error);

    // Mensaje genérico: no revela si el correo existe o si la contraseña falló
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    };
    res.json({ user: safeUser, token: signToken(safeUser) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (requiere token; devuelve el usuario autenticado)
async function me(req, res, next) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return next(error);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Si es artista, adjunta su perfil profesional
    if (user.role === 'artista') {
      const { data: profile } = await supabase
        .from('artist_profiles')
        .select('id, genre, bio, hourly_rate, city, rating_avg, is_available')
        .eq('user_id', user.id)
        .maybeSingle();
      user.artist_profile = profile || null;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };

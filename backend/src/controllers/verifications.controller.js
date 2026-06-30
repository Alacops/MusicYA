const { supabase } = require('../config/supabase');
const { createNotification } = require('./notifications.controller');

// Respaldos de artistas verificados necesarios para verificar a un artista nuevo.
const REQUIRED_ENDORSEMENTS = 2;

// Notifica sin romper el flujo principal
async function notify(userId, title, body) {
  try {
    await createNotification(userId, title, body);
  } catch (err) {
    console.warn('⚠ No se pudo notificar:', err.message);
  }
}

// Perfil de artista del usuario autenticado (o null)
async function getMyArtistProfile(userId) {
  const { data } = await supabase
    .from('artist_profiles')
    .select('id, is_verified')
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

// Cuenta los respaldos provenientes de artistas que están verificados
async function countVerifiedEndorsements(artistId) {
  const { data: rows, error } = await supabase
    .from('artist_endorsements')
    .select('endorser_id')
    .eq('artist_id', artistId);
  if (error) throw error;
  const ids = [...new Set((rows || []).map((r) => r.endorser_id))];
  if (ids.length === 0) return 0;

  const { count, error: cErr } = await supabase
    .from('artist_profiles')
    .select('id', { count: 'exact', head: true })
    .in('id', ids)
    .eq('is_verified', true);
  if (cErr) throw cErr;
  return count || 0;
}

// POST /api/artists/:id/endorse  (un artista verificado respalda a otro)
async function endorse(req, res, next) {
  try {
    const artistId = req.params.id;
    const { comment } = req.body;

    // El que respalda debe ser un artista verificado
    const endorser = await getMyArtistProfile(req.user.id);
    if (!endorser) return res.status(403).json({ message: 'Solo los artistas pueden respaldar' });
    if (!endorser.is_verified) {
      return res.status(403).json({ message: 'Solo los artistas verificados pueden respaldar a otros' });
    }

    // El artista respaldado debe existir
    const { data: target, error: tErr } = await supabase
      .from('artist_profiles')
      .select('id, user_id, is_verified')
      .eq('id', artistId)
      .maybeSingle();
    if (tErr) return next(tErr);
    if (!target) return res.status(404).json({ message: 'Artista no encontrado' });
    if (Number(target.id) === Number(endorser.id)) {
      return res.status(400).json({ message: 'No puedes respaldarte a ti mismo' });
    }

    // Registrar el respaldo (único por par)
    const { error: insErr } = await supabase
      .from('artist_endorsements')
      .insert({ artist_id: target.id, endorser_id: endorser.id, comment: comment || null });
    if (insErr) {
      if (insErr.code === '23505') {
        return res.status(409).json({ message: 'Ya habías respaldado a este artista' });
      }
      return next(insErr);
    }

    // ¿Alcanzó el umbral para quedar verificado?
    const verifiedCount = await countVerifiedEndorsements(target.id);
    let isVerified = target.is_verified;
    if (!isVerified && verifiedCount >= REQUIRED_ENDORSEMENTS) {
      const { error: upErr } = await supabase
        .from('artist_profiles')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', target.id);
      if (upErr) return next(upErr);
      isVerified = true;
      await notify(
        target.user_id,
        '¡Eres un artista verificado! ✓',
        'La comunidad respaldó tu autenticidad. Tu perfil ahora muestra la insignia verificada.'
      );
    }

    res.status(201).json({
      endorsements: verifiedCount,
      required: REQUIRED_ENDORSEMENTS,
      is_verified: isVerified,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/artists/:id/verification  (estado de verificación + respaldos) — público
async function getStatus(req, res, next) {
  try {
    const artistId = req.params.id;
    const { data: artist, error } = await supabase
      .from('artist_profiles')
      .select('id, is_verified, verified_at, social_links, verification_doc_url')
      .eq('id', artistId)
      .maybeSingle();
    if (error) return next(error);
    if (!artist) return res.status(404).json({ message: 'Artista no encontrado' });

    const { data: rows, error: eErr } = await supabase
      .from('artist_endorsements')
      .select('id, comment, created_at, artist_profiles!artist_endorsements_endorser_id_fkey(is_verified, users(name))')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });
    if (eErr) return next(eErr);

    // Solo cuentan/mostramos respaldos de artistas verificados
    const endorsements = (rows || [])
      .filter((r) => r.artist_profiles?.is_verified)
      .map((r) => ({
        name: r.artist_profiles?.users?.name || 'Artista',
        comment: r.comment,
        created_at: r.created_at,
      }));

    res.json({
      is_verified: artist.is_verified,
      verified_at: artist.verified_at,
      required: REQUIRED_ENDORSEMENTS,
      count: endorsements.length,
      endorsements,
      has_social: artist.social_links != null && Object.keys(artist.social_links || {}).length > 0,
      has_document: !!artist.verification_doc_url,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { endorse, getStatus };

const QRCode = require('qrcode');
const { supabase } = require('../config/supabase');
const { createNotification } = require('./notifications.controller');

// Estados de reserva en los que NO se puede pagar
const UNPAYABLE_STATUSES = ['cancelada', 'finalizada'];

// Notifica de forma no-fatal: un fallo al notificar nunca rompe el flujo principal
async function notify(userId, title, body) {
  try {
    await createNotification(userId, title, body);
  } catch (err) {
    console.warn('⚠ No se pudo crear la notificación:', err.message);
  }
}

// Carga la reserva con el artista (y su usuario) o null
async function loadBooking(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_id, status, total, artist_profiles(user_id, users(name))')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// POST /api/payments/:bookingId/qr
// Genera un código QR (dataURL) con la información de pago de la reserva
async function generateQR(req, res, next) {
  try {
    const booking = await loadBooking(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    // Solo el cliente que hizo la reserva paga
    if (Number(booking.client_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el cliente de la reserva puede pagar' });
    }
    if (booking.status === 'pagada') {
      return res.status(409).json({ message: 'Esta reserva ya fue pagada' });
    }
    if (UNPAYABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({ message: `No se puede pagar una reserva '${booking.status}'` });
    }
    if (booking.total == null) {
      return res.status(400).json({ message: 'La reserva no tiene un monto definido' });
    }

    // Reutiliza un pago pendiente si ya existe; si no, crea uno
    let { data: payment, error: findError } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('booking_id', booking.id)
      .eq('status', 'pendiente')
      .maybeSingle();
    if (findError) return next(findError);

    if (!payment) {
      const { data: created, error: insError } = await supabase
        .from('payments')
        .insert({ booking_id: booking.id, method: 'qr', amount: booking.total, status: 'pendiente' })
        .select('id, amount, status')
        .single();
      if (insError) return next(insError);
      payment = created;
    }

    const payload = JSON.stringify({
      bookingId: booking.id,
      paymentId: payment.id,
      amount: payment.amount,
      beneficiary: booking.artist_profiles?.users?.name || 'Artista MusicYA',
      issuedAt: Date.now(),
    });
    const qrDataUrl = await QRCode.toDataURL(payload);

    res.json({
      booking_id: booking.id,
      payment_id: payment.id,
      amount: payment.amount,
      qr: qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/:bookingId/confirm
// Valida el comprobante de pago (MVP sin pasarela bancaria real):
// marca el pago como 'pagado' y la reserva como 'pagada'.
async function confirm(req, res, next) {
  try {
    const { receipt_url } = req.body;

    const booking = await loadBooking(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    if (Number(booking.client_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el cliente de la reserva puede confirmar el pago' });
    }
    if (booking.status === 'pagada') {
      return res.status(409).json({ message: 'Esta reserva ya fue pagada' });
    }
    if (UNPAYABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({ message: `No se puede pagar una reserva '${booking.status}'` });
    }

    // Debe existir un pago pendiente (generado al crear el QR)
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('status', 'pendiente')
      .maybeSingle();
    if (findError) return next(findError);
    if (!payment) {
      return res.status(400).json({ message: 'Genera primero el QR de pago para esta reserva' });
    }

    // 1) Marca el pago como pagado y guarda el comprobante
    const { data: paid, error: payError } = await supabase
      .from('payments')
      .update({ status: 'pagado', receipt_url: receipt_url || null })
      .eq('id', payment.id)
      .select('id, amount, status, receipt_url')
      .single();
    if (payError) return next(payError);

    // 2) Marca la reserva como pagada
    const { data: updatedBooking, error: bkError } = await supabase
      .from('bookings')
      .update({ status: 'pagada' })
      .eq('id', booking.id)
      .select('id, status, total')
      .single();
    if (bkError) return next(bkError);

    // 3) Notifica al artista que recibió el pago
    const artistUserId = booking.artist_profiles?.user_id;
    if (artistUserId) {
      await notify(
        artistUserId,
        'Pago recibido',
        `Se confirmó el pago de la reserva #${booking.id}.`
      );
    }

    res.json({ booking: updatedBooking, payment: paid });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateQR, confirm };

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { Field, PrimaryButton } from '../components/form';
import { colors, spacing } from '../theme';

type QrResponse = { booking_id: number; payment_id: number; amount: number; qr: string };

export default function PaymentScreen({
  bookingId,
  onBack,
  onPaid,
}: {
  bookingId: number;
  onBack: () => void;
  onPaid: () => void;
}) {
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  // Genera (o reutiliza) el QR de pago al abrir la pantalla
  useEffect(() => {
    api
      .post<QrResponse>(`/payments/${bookingId}/qr`, {})
      .then(setQr)
      .catch((e) => setError(e.message || 'No se pudo generar el QR'));
  }, [bookingId]);

  async function confirmar() {
    setError(null);
    setConfirming(true);
    try {
      await api.post(`/payments/${bookingId}/confirm`, receipt ? { receipt_url: receipt.trim() } : {});
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'No se pudo confirmar el pago');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backLink}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Pago con QR</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {done ? (
        <View style={styles.okBox}>
          <Text style={styles.okEmoji}>✅</Text>
          <Text style={styles.okText}>¡Pago confirmado!</Text>
          <Text style={styles.okSub}>Tu reserva quedó marcada como pagada.</Text>
          <PrimaryButton title="Volver a mis reservas" onPress={onPaid} />
        </View>
      ) : qr === null ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
      ) : (
        <>
          <View style={styles.qrCard}>
            <Text style={styles.amount}>S/ {qr.amount}</Text>
            <Image source={{ uri: qr.qr }} style={styles.qrImage} resizeMode="contain" />
            <Text style={styles.qrHint}>Escanea el código para pagar con tu app (Yape / Plin)</Text>
          </View>

          <Text style={styles.sectionTitle}>Confirmar pago</Text>
          <Text style={styles.help}>
            Tras pagar, adjunta el enlace de tu comprobante (opcional) y confirma.
          </Text>
          <Field
            label="Comprobante (URL, opcional)"
            value={receipt}
            onChangeText={setReceipt}
            placeholder="https://… captura de tu pago"
            autoCapitalize="none"
          />
          <PrimaryButton title="Ya pagué, confirmar" onPress={confirmar} loading={confirming} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: 56, paddingBottom: 48 },
  backBtn: { marginBottom: spacing.md },
  backLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing.lg },
  errorBox: { backgroundColor: '#3B1219', borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  amount: { color: colors.accent, fontSize: 28, fontWeight: '800', marginBottom: spacing.md },
  qrImage: { width: 220, height: 220, backgroundColor: '#fff', borderRadius: 8 },
  qrHint: { color: colors.muted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  help: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  okBox: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, alignItems: 'center' },
  okEmoji: { fontSize: 48 },
  okText: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  okSub: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: spacing.lg, textAlign: 'center' },
});

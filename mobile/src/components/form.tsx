import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';

// Campo de formulario con etiqueta + input estilizado
export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

// Botón principal con estado de carga
export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, off && styles.buttonDisabled]}
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});

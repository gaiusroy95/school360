import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  message: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
});

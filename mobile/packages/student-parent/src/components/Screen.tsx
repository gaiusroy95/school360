import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type ScreenProps = ScrollViewProps & {
  title?: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  children: React.ReactNode;
};

export function Screen({
  title,
  loading,
  error,
  onRefresh,
  refreshing,
  scroll = true,
  children,
  ...scrollProps
}: ScreenProps) {
  const content = (
    <>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        children
      )}
    </>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.container}>{content}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
        {...scrollProps}
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  container: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  loading: { paddingVertical: 48, alignItems: 'center' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: colors.danger, fontSize: 14 },
});

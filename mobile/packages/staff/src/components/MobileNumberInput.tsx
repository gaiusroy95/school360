import { StyleSheet, Text, TextInput, View } from 'react-native';
import { INDIA_MOBILE_PREFIX, extractLocalMobileDigits } from '@360schoolerp/shared';
import { colors, radius, spacing } from '../theme';

type Props = {
  value: string;
  onChange: (localDigits: string) => void;
  placeholder?: string;
};

export function MobileNumberInput({ value, onChange, placeholder = '9876543210' }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>{INDIA_MOBILE_PREFIX}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChange(extractLocalMobileDigits(text))}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  prefix: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: '#f1f5f9',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
});

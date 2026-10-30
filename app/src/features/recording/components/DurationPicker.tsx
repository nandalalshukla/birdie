import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, useThemeColors } from '@/theme';

const OPTIONS = [10, 12, 15];

export function DurationPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (s: number) => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      {OPTIONS.map((s) => {
        const selected = s === value;
        return (
          <Pressable
            key={s}
            disabled={disabled}
            onPress={() => onChange(s)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primaryMuted : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: '600' }}>{s}s</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1 },
});

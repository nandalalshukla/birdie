import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useThemeColors } from '@/theme';

import { Text } from './Text';

type Props<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const colors = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.item, selected && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, padding: 3 },
  item: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
});

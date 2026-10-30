import { StyleSheet, View } from 'react-native';

import { radius, useThemeColors } from '@/theme';

/** Scrolling bar graph of recent input levels (0..1). */
export function LevelMeter({ levels, active }: { levels: number[]; active: boolean }) {
  const colors = useThemeColors();
  return (
    <View style={styles.row} accessibilityLabel="Input level">
      {levels.map((l, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 4 + (active ? l : 0) * 40, backgroundColor: active ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 48 },
  bar: { width: 5, borderRadius: radius.sm },
});

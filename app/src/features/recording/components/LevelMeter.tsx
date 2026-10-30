import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, useThemeColors } from '@/theme';

const BARS = 32;

/** Scrolling bar graph of input level (dBFS from the recorder's metering). */
export function LevelMeter({ metering, active }: { metering: number | null; active: boolean }) {
  const colors = useThemeColors();
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));

  useEffect(() => {
    if (!active) return;
    // -60 dBFS → 0, 0 dBFS → 1
    const level = metering == null ? 0 : Math.min(1, Math.max(0, (metering + 60) / 60));
    setLevels((prev) => [...prev.slice(1), level]);
  }, [metering, active]);

  useEffect(() => {
    if (!active) setLevels(Array(BARS).fill(0));
  }, [active]);

  return (
    <View style={styles.row} accessibilityLabel="Input level">
      {levels.map((l, i) => (
        <View
          key={i}
          style={[styles.bar, { height: 4 + l * 40, backgroundColor: active ? colors.primary : colors.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 48 },
  bar: { width: 5, borderRadius: radius.sm },
});

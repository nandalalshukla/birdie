import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { radius, spacing, useThemeColors } from '@/theme';

import type { WindowDetection } from '../types';

type Props = {
  windows: WindowDetection[];
  windowCount: number;
  windowSeconds: number;
};

/** One column per 3 s window, showing BirdNET's top guess for that slice. */
export function WindowTimeline({ windows, windowCount, windowSeconds }: Props) {
  const colors = useThemeColors();
  const slots = Array.from({ length: windowCount }, (_, i) => {
    const start = i * windowSeconds;
    const best = windows
      .filter((w) => Math.abs(w.start - start) < 0.01)
      .sort((a, b) => b.confidence - a.confidence)[0];
    return { start, best };
  });

  return (
    <View style={styles.row}>
      {slots.map(({ start, best }) => (
        <View
          key={start}
          style={[
            styles.slot,
            {
              borderColor: colors.border,
              backgroundColor: best ? colors.primaryMuted : colors.surface,
            },
          ]}
        >
          <Text variant="caption" muted>
            {start}–{start + windowSeconds}s
          </Text>
          <Text variant="caption" numberOfLines={2} style={styles.name}>
            {best ? best.common_name : '—'}
          </Text>
          {best ? (
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {formatPercent(best.confidence)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  slot: { flex: 1, minHeight: 72, padding: spacing.xs, borderRadius: radius.sm, borderWidth: 1, gap: 2 },
  name: { fontWeight: '600' },
});

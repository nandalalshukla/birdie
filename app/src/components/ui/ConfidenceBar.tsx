import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { radius, spacing, useThemeColors } from '@/theme';

import { Text } from './Text';

export function confidenceLabel(value: number): string {
  if (value >= 0.85) return 'Very likely';
  if (value >= 0.7) return 'Likely';
  if (value >= 0.5) return 'Possible';
  return 'Unlikely';
}

export function ConfidenceBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const colors = useThemeColors();
  const color = value >= 0.7 ? colors.primary : value >= 0.5 ? colors.accent : colors.textMuted;
  return (
    <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
      {showLabel ? (
        <Text variant="caption" muted style={styles.label}>
          {confidenceLabel(value)} · {formatPercent(value)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  label: {},
});

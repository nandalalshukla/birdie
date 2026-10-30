import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing, useThemeColors } from '@/theme';

import type { JobStatus } from '../types';

const STEPS: { status: JobStatus; label: string }[] = [
  { status: 'queued', label: 'Uploaded, waiting in queue…' },
  { status: 'processing', label: 'Listening with BirdNET…' },
];

export function JobProgress({ status }: { status: JobStatus | undefined }) {
  const colors = useThemeColors();
  const label = STEPS.find((s) => s.status === status)?.label ?? 'Uploading…';
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text variant="heading">{label}</Text>
      <Text muted style={styles.hint}>
        The clip is resampled to 48 kHz, split into 3-second windows and each window is scored against ~6,000
        species.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  hint: { textAlign: 'center' },
});

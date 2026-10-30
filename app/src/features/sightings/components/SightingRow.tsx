import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { SpeciesPhoto, useSpeciesInfo } from '@/features/species';
import { formatPercent, formatRelativeTime } from '@/lib/format';
import { spacing, useThemeColors } from '@/theme';

import type { Sighting } from '../types';

type Props = {
  sighting: Sighting;
  onPress?: () => void;
  onLongPress?: () => void;
  showObserver?: boolean;
};

export function SightingRow({ sighting, onPress, onLongPress, showObserver }: Props) {
  const colors = useThemeColors();
  const { info } = useSpeciesInfo(sighting.scientific_name, sighting.common_name);
  const who = sighting.is_mine ? 'You' : sighting.observer_name || 'A birder';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.primaryMuted : colors.surface, borderColor: colors.border },
      ]}
    >
      <SpeciesPhoto uri={info?.photo_url} size={56} />
      <View style={styles.body}>
        <Text style={styles.name}>{sighting.common_name}</Text>
        <Text variant="caption" muted>
          {showObserver ? `${who} · ` : ''}
          {formatRelativeTime(sighting.observed_at)} · {formatPercent(sighting.confidence)}
          {!sighting.is_public ? ' · private' : ''}
        </Text>
        {sighting.note ? (
          <Text variant="caption" numberOfLines={2}>
            “{sighting.note}”
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  body: { flex: 1, gap: 2 },
  name: { fontWeight: '600' },
});

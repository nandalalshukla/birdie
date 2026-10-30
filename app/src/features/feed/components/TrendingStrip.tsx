import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { SpeciesPhoto, useSpeciesInfo } from '@/features/species';
import { radius, spacing, useThemeColors } from '@/theme';

import type { FeedStats, TrendingSpecies } from '../api';

function Chip({ t, selected, onPress }: { t: TrendingSpecies; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const { info } = useSpeciesInfo(t.scientific_name, t.common_name);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primaryMuted : colors.surface },
      ]}
    >
      <SpeciesPhoto uri={info?.photo_url} size={40} />
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {t.common_name}
        </Text>
        <Text variant="caption" muted>
          {t.sightings} sighting{t.sightings === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );
}

type Props = {
  stats: FeedStats;
  selected: string | null;
  onSelect: (scientificName: string | null) => void;
};

export function TrendingStrip({ stats, selected, onSelect }: Props) {
  if (!stats.trending.length) return null;
  return (
    <View style={styles.wrap}>
      <Text variant="caption" muted>
        HEARD IN THE LAST {stats.days} DAYS · {stats.species} species · {stats.observers} birder
        {stats.observers === 1 ? '' : 's'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {stats.trending.map((t) => (
          <Chip
            key={t.scientific_name}
            t={t}
            selected={selected === t.scientific_name}
            onPress={() => onSelect(selected === t.scientific_name ? null : t.scientific_name)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs + 2,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    maxWidth: 220,
  },
  name: { fontWeight: '600' },
});

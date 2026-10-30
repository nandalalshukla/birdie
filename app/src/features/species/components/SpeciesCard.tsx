import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { PlayButton } from '@/components/media/PlayButton';
import { Card, ConfidenceBar, Text } from '@/components/ui';
import { spacing, useThemeColors } from '@/theme';

import { useSpeciesInfo } from '../hooks/useSpeciesInfo';
import { SpeciesPhoto } from './SpeciesPhoto';

type Props = {
  scientificName: string;
  commonName: string;
  confidence: number;
  subtitle?: string;
  expanded?: boolean;
  footer?: React.ReactNode;
};

export function SpeciesCard({ scientificName, commonName, confidence, subtitle, expanded = false, footer }: Props) {
  const colors = useThemeColors();
  const { info } = useSpeciesInfo(scientificName, commonName);

  return (
    <Card>
      <View style={styles.row}>
        <SpeciesPhoto uri={info?.photo_url} size={expanded ? 104 : 80} />
        <View style={styles.body}>
          <Text variant="heading">{commonName}</Text>
          <Text muted style={styles.italic}>
            {scientificName}
          </Text>
          <ConfidenceBar value={confidence} />
          {subtitle ? (
            <Text variant="caption" muted>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {expanded && info?.summary ? (
        <Text muted numberOfLines={4}>
          {info.summary}
        </Text>
      ) : null}

      {expanded ? (
        <View style={styles.actions}>
          {info?.call_url ? (
            <PlayButton uri={info.call_url} label="Reference call" />
          ) : info?.call_page_url ? (
            <Pressable onPress={() => Linking.openURL(info.call_page_url!)}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Listen on xeno-canto ↗</Text>
            </Pressable>
          ) : null}
          {info?.wikipedia_url ? (
            <Pressable onPress={() => Linking.openURL(info.wikipedia_url!)}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Wikipedia ↗</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {expanded && (info?.photo_attribution || info?.call_attribution) ? (
        <Text variant="caption" muted>
          {[info.photo_attribution && `Photo ${info.photo_attribution}`, info.call_attribution && `Call ${info.call_attribution}`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  italic: { fontStyle: 'italic' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg },
});

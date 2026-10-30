import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useProfile } from '@/features/profile';
import { spacing, useThemeColors } from '@/theme';

import { createSighting } from '../api';

type Props = {
  jobId: string;
  scientificName: string;
  commonName: string;
  hasLocation: boolean;
  fallbackLocation?: { lat: number; lon: number } | null;
  primary?: boolean;
};

export function SaveSightingButton({ jobId, scientificName, commonName, hasLocation, fallbackLocation, primary }: Props) {
  const colors = useThemeColors();
  const { profile } = useProfile();
  const [isPublic, setIsPublic] = useState(profile.shareByDefault);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canSave = hasLocation || !!fallbackLocation;

  const onSave = async () => {
    setSaving(true);
    try {
      await createSighting({
        jobId,
        scientificName,
        isPublic,
        observerName: profile.displayName,
        lat: fallbackLocation?.lat,
        lon: fallbackLocation?.lon,
      });
      setSaved(true);
    } catch (e) {
      Alert.alert(`Couldn't save ${commonName}`, e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Text style={{ color: colors.primary, fontWeight: '600' }}>
        ✓ Saved to your map{isPublic ? ' and shared with the community' : ''}
      </Text>
    );
  }

  if (!canSave) {
    return (
      <Text variant="caption" muted>
        Turn on location to save sightings to the map.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text variant="caption" muted style={styles.flex}>
          Share with the community feed
        </Text>
        <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.primary }} />
      </View>
      <Button
        title="Save sighting"
        variant={primary ? 'primary' : 'secondary'}
        onPress={onSave}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});

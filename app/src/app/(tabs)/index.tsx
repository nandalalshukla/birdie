import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { RECORDING_DEFAULT_SECONDS } from '@/config/constants';
import { uploadRecording } from '@/features/analysis';
import { useCurrentLocation } from '@/features/location/useCurrentLocation';
import { DurationPicker, LevelMeter, RecordButton, useBirdRecorder } from '@/features/recording';
import { formatCoords, formatSeconds } from '@/lib/format';
import { spacing, useThemeColors } from '@/theme';

export default function ListenScreen() {
  const colors = useThemeColors();
  const [duration, setDuration] = useState(RECORDING_DEFAULT_SECONDS);
  const [uploading, setUploading] = useState(false);
  const recorder = useBirdRecorder(duration);
  const location = useCurrentLocation();

  const isRecording = recorder.phase === 'recording';

  const onPressRecord = () => {
    if (isRecording) {
      if (recorder.canStop) void recorder.stop();
      return;
    }
    if (location.status !== 'ready') void location.refresh();
    void recorder.start();
  };

  const onIdentify = async () => {
    if (!recorder.result) return;
    setUploading(true);
    try {
      const { id } = await uploadRecording({
        uri: recorder.result.uri,
        lat: location.coords?.lat,
        lon: location.coords?.lon,
      });
      recorder.reset();
      router.push({ pathname: '/analysis/[id]', params: { id } });
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll style={styles.content}>
      <View style={styles.header}>
        <Text variant="title">What&apos;s singing?</Text>
        <Text muted style={styles.center}>
          Point your phone towards the bird and record {duration} seconds.
        </Text>
      </View>

      <RecordButton
        recording={isRecording}
        progress={Math.min(1, recorder.elapsedSeconds / duration)}
        disabled={recorder.phase === 'stopping' || uploading || (isRecording && !recorder.canStop)}
        onPress={onPressRecord}
      />

      <Text variant="heading">
        {formatSeconds(recorder.elapsedSeconds)} / {formatSeconds(duration)}
      </Text>
      <LevelMeter levels={recorder.levels} active={isRecording} />

      {recorder.phase === 'finished' ? (
        <View style={styles.actions}>
          <Button title="Identify bird" onPress={onIdentify} loading={uploading} />
          <Button title="Record again" variant="secondary" onPress={recorder.reset} disabled={uploading} />
        </View>
      ) : (
        <DurationPicker value={duration} onChange={setDuration} disabled={isRecording} />
      )}

      {recorder.error ? <Text style={{ color: colors.danger }}>{recorder.error}</Text> : null}

      <Card style={styles.locationCard}>
        <Ionicons
          name={location.status === 'ready' ? 'location' : 'location-outline'}
          size={20}
          color={location.status === 'ready' ? colors.primary : colors.textMuted}
        />
        <View style={styles.flex}>
          {location.status === 'ready' && location.coords ? (
            <>
              <Text>{formatCoords(location.coords.lat, location.coords.lon)}</Text>
              <Text variant="caption" muted>
                Only species expected here this week will be considered
                {location.coords.accuracy ? ` · ±${Math.round(location.coords.accuracy)} m` : ''}
              </Text>
            </>
          ) : location.status === 'locating' ? (
            <Text muted>Finding your location…</Text>
          ) : (
            <Text muted>Location off — results will cover all ~6,000 species.</Text>
          )}
        </View>
        {location.status === 'denied' || location.status === 'error' ? (
          <Button title="Retry" variant="secondary" onPress={() => void location.refresh()} />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingVertical: spacing.xl },
  header: { alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
  locationCard: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: spacing.md },
  flex: { flex: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, useThemeColors } from '@/theme';

type Props = { uri: string; label: string };

/** Streams a remote audio file with a single play/pause toggle. */
export function PlayButton({ uri, label }: Props) {
  const colors = useThemeColors();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    if (status.duration > 0 && status.currentTime >= status.duration - 0.05) await player.seekTo(0);
    player.play();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${status.playing ? 'Pause' : 'Play'} ${label}`}
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.primary, backgroundColor: pressed ? colors.primaryMuted : 'transparent' },
      ]}
    >
      <Ionicons
        name={status.isBuffering && !status.isLoaded ? 'hourglass' : status.playing ? 'pause' : 'play'}
        size={18}
        color={colors.primary}
      />
      <Text style={{ color: colors.primary, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});

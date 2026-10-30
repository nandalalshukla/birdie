import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useProfile } from '@/features/profile';
import { radius, spacing, useThemeColors } from '@/theme';

/** Lets the user choose the name shown next to their shared sightings. */
export function ProfileBanner() {
  const { profile, ready } = useProfile();
  // Remount once the stored profile has loaded so the input starts from it.
  return <NameEditor key={ready ? 'ready' : 'loading'} initial={profile.displayName ?? ''} />;
}

function NameEditor({ initial }: { initial: string }) {
  const colors = useThemeColors();
  const { update } = useProfile();
  const [name, setName] = useState(initial);

  return (
    <Card>
      <Text variant="caption" muted>
        YOUR NAME IN THE FEED
      </Text>
      <View style={styles.row}>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => void update({ displayName: name.trim() || null })}
          onSubmitEditing={() => void update({ displayName: name.trim() || null })}
          placeholder="Anonymous birder"
          placeholderTextColor={colors.textMuted}
          maxLength={64}
          returnKeyType="done"
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
});

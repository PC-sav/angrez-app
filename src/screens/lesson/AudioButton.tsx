/**
 * Plays a cached or remote audio file.
 * In-app playback requires expo-av: npx expo install expo-av && npx expo run:android
 * Until then, tapping opens the audio in the system media player via Linking.
 */
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { getAssetByPath } from '../../db/content';
import { resolveAsset } from '../../api';

interface Props {
  remotePath: string | undefined;
  size?: 'normal' | 'large';
}

export function AudioButton({ remotePath, size = 'normal' }: Props) {
  const [playing, setPlaying] = useState(false);

  const handlePress = useCallback(async () => {
    if (!remotePath || playing) return;
    setPlaying(true);
    try {
      let uri: string;
      const cached = await getAssetByPath(remotePath);
      if (cached?.status === 'downloaded' && cached.local_uri) {
        uri = cached.local_uri;
      } else {
        uri = resolveAsset(remotePath);
      }
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      }
    } catch (e) {
      console.warn('[AudioButton] failed:', e);
    } finally {
      setPlaying(false);
    }
  }, [remotePath, playing]);

  if (!remotePath) return null;

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, size === 'large' && styles.large]}
      accessibilityRole="button"
      accessibilityLabel="ऑडियो सुनें"
    >
      <Text style={[styles.icon, size === 'large' && styles.iconLarge]}>
        {playing ? '⏸' : '🔊'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF5FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
  },
  icon: {
    fontSize: 16,
  },
  iconLarge: {
    fontSize: 24,
  },
});

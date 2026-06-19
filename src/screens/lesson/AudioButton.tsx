import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAssetByPath } from '../../db/content';
import { resolveAsset } from '../../api';

interface Props {
  remotePath: string | undefined;
  size?: 'normal' | 'large';
}

let audioModeReady = false;

function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(
    (e) => console.warn('[audio] setAudioModeAsync failed:', e),
  );
}

export function AudioButton({ remotePath, size = 'normal' }: Props) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    ensureAudioMode();
    if (!remotePath) return;
    (async () => {
      try {
        const cached = await getAssetByPath(remotePath);
        setUri(
          cached?.status === 'downloaded' && cached.local_uri
            ? cached.local_uri
            : resolveAsset(remotePath),
        );
      } catch (e) {
        console.warn('[AudioButton] resolve failed:', e);
        setUri(resolveAsset(remotePath));
      }
    })();
  }, [remotePath]);

  const player = useAudioPlayer(uri);

  const handlePress = () => {
    if (!uri) return;
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn('[AudioButton] playback failed:', e);
    }
  };

  if (!remotePath) return null;

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, size === 'large' && styles.large]}
      accessibilityRole="button"
      accessibilityLabel="ऑडियो सुनें"
    >
      <Text style={[styles.icon, size === 'large' && styles.iconLarge]}>
        {player.playing ? '⏸' : '🔊'}
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

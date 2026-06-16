import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { SpeakThePicturePuzzle } from '../../../api/endpoints';
import { getAssetByPath } from '../../../db/content';
import { resolveAsset } from '../../../api';

interface Props {
  puzzle: SpeakThePicturePuzzle;
}

export function SpeakThePicture({ puzzle }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!puzzle.image) return;
    getAssetByPath(puzzle.image)
      .then((row) => {
        setImageUri(
          row?.status === 'downloaded' && row.local_uri
            ? row.local_uri
            : resolveAsset(puzzle.image!),
        );
      })
      .catch(() => setImageUri(resolveAsset(puzzle.image!)));
  }, [puzzle.image]);

  return (
    <View style={styles.root}>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityRole="image"
        />
      )}
      {puzzle.instruction_l1 && (
        <Text style={styles.instruction}>{puzzle.instruction_l1}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F0EBE3',
  },
  instruction: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
});

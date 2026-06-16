import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ListenAndRespondPuzzle } from '../../../api/endpoints';
import { AudioButton } from '../AudioButton';

interface Props {
  puzzle: ListenAndRespondPuzzle;
}

export function ListenAndRespond({ puzzle }: Props) {
  const prompt = puzzle.prompt_en ?? puzzle.instruction_l1 ?? '';

  return (
    <View style={styles.root}>
      {puzzle.audio && (
        <View style={styles.audioRow}>
          <AudioButton remotePath={puzzle.audio} size="large" />
        </View>
      )}
      {prompt.length > 0 && (
        <Text style={styles.prompt}>{prompt}</Text>
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
  audioRow: {
    alignItems: 'center',
  },
  prompt: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 26,
  },
});

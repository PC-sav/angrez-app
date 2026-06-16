import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RepetitionDrillPuzzle } from '../../../api/endpoints';
import { AudioButton } from '../AudioButton';

interface Props {
  puzzle: RepetitionDrillPuzzle;
}

export function RepetitionDrill({ puzzle }: Props) {
  return (
    <View style={styles.root}>
      {puzzle.audio && (
        <View style={styles.audioRow}>
          <AudioButton remotePath={puzzle.audio} size="large" />
          <Text style={styles.tapHint}>सुनें, फिर दोहराएं</Text>
        </View>
      )}
      {puzzle.target && (
        <View style={styles.targetBox}>
          <Text style={styles.target}>{puzzle.target}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  audioRow: {
    alignItems: 'center',
    gap: 8,
  },
  tapHint: {
    fontSize: 13,
    color: '#888',
  },
  targetBox: {
    backgroundColor: '#EEF5FD',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  target: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
});

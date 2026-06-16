import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RolePlayTurnPuzzle } from '../../../api/endpoints';
import { AudioButton } from '../AudioButton';

interface Props {
  puzzle: RolePlayTurnPuzzle;
  postFeedbackVisible: boolean;
}

export function RolePlayTurn({ puzzle, postFeedbackVisible }: Props) {
  return (
    <View style={styles.root}>
      {puzzle.ai_line_audio && (
        <View style={styles.aiRow}>
          <AudioButton remotePath={puzzle.ai_line_audio} size="large" />
          <Text style={styles.aiHint}>AI की बात सुनें</Text>
        </View>
      )}
      {puzzle.scenario_l1 && (
        <View style={styles.scenarioCard}>
          <Text style={styles.scenarioLabel}>परिदृश्य</Text>
          <Text style={styles.scenarioText}>{puzzle.scenario_l1}</Text>
        </View>
      )}
      {postFeedbackVisible && puzzle.post_feedback_l1 && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{puzzle.post_feedback_l1}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
    paddingVertical: 8,
  },
  aiRow: {
    alignItems: 'center',
    gap: 8,
  },
  aiHint: {
    fontSize: 13,
    color: '#888',
  },
  scenarioCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  scenarioLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C8860A',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scenarioText: {
    fontSize: 16,
    color: '#1A1A2E',
    lineHeight: 24,
  },
  feedbackCard: {
    backgroundColor: '#F0F9E8',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  feedbackText: {
    fontSize: 15,
    color: '#1A4A2E',
    lineHeight: 22,
  },
});

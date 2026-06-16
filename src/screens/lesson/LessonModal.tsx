import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Pressable,
  SafeAreaView, StyleSheet, Text, View, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';
import { getCurrentPlan } from '../../db/content';
import type { LessonPayload, SubstageCompleteResponse } from '../../api/endpoints';
import { LESSON } from '../../copy/lesson';
import { TeachScreen } from './TeachScreen';
import { PuzzlePlayer } from './PuzzlePlayer';

type Nav = NativeStackNavigationProp<MainStackParamList, 'LessonModal'>;
type Route = RouteProp<MainStackParamList, 'LessonModal'>;

type LessonPhase = 'loading' | 'teach' | 'puzzles' | 'complete';

function confirmExit(onConfirm: () => void) {
  Alert.alert(
    'पाठ छोड़ें?',
    'अभी छोड़ने पर प्रगति सुरक्षित रहेगी।',
    [
      { text: 'नहीं', style: 'cancel' },
      { text: 'हाँ, छोड़ें', style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}

// ── Completion screen ─────────────────────────────────────────────────────────

function CompletionScreen({
  result,
  title,
  onReturn,
}: {
  result: SubstageCompleteResponse;
  title: string;
  onReturn: () => void;
}) {
  return (
    <View style={styles.completionRoot}>
      <Text style={styles.completionEmoji}>{result.mastered ? '🎉' : '💪'}</Text>
      <Text style={styles.completionTitle}>
        {result.mastered
          ? LESSON.completion.passed(title)
          : LESSON.completion.notPassed}
      </Text>
      {result.message ? (
        <Text style={styles.completionMastery}>{result.message}</Text>
      ) : null}
      {result.points_awarded > 0 && (
        <Text style={styles.completionPoints}>
          {LESSON.completion.pointsLabel(result.points_awarded)}
        </Text>
      )}
      <Pressable onPress={onReturn} style={styles.returnButton}>
        <Text style={styles.returnButtonText}>{LESSON.completion.returnButton}</Text>
      </Pressable>
    </View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function LessonModal() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { lessonId } = route.params;

  const [lessonPhase, setLessonPhase] = useState<LessonPhase>('loading');
  const [payload, setPayload] = useState<LessonPayload | null>(null);
  const [completionResult, setCompletionResult] = useState<SubstageCompleteResponse | null>(null);

  // Load lesson content from SQLite (the cached payload_json from F4)
  useEffect(() => {
    getCurrentPlan()
      .then((plan) => {
        if (!plan) {
          setLessonPhase('loading');
          return;
        }
        try {
          const parsed: LessonPayload = JSON.parse(plan.payload_json);
          setPayload(parsed);
          // Skip teach screen if no teach items
          setLessonPhase(parsed.teach?.length > 0 ? 'teach' : 'puzzles');
        } catch (e) {
          console.warn('[LessonModal] failed to parse payload_json:', e);
          setLessonPhase('loading');
        }
      })
      .catch((e) => {
        console.warn('[LessonModal] getCurrentPlan failed:', e);
      });
  }, [lessonId]);

  const handleExit = useCallback(() => {
    confirmExit(() => navigation.goBack());
  }, [navigation]);

  // Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (lessonPhase === 'complete') {
          navigation.goBack();
        } else {
          confirmExit(() => navigation.goBack());
        }
        return true;
      });
      return () => sub.remove();
    }, [navigation, lessonPhase]),
  );

  const handleTeachComplete = useCallback(() => {
    setLessonPhase('puzzles');
  }, []);

  const handlePuzzlesComplete = useCallback((result: SubstageCompleteResponse) => {
    setCompletionResult(result);
    setLessonPhase('complete');
  }, []);

  const handleReturn = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const headerTitle =
    lessonPhase === 'teach'
      ? 'सीखें'
      : lessonPhase === 'puzzles'
        ? 'अभ्यास'
        : payload?.title_l1 ?? 'पाठ';

  return (
    <SafeAreaView style={styles.root}>
      {/* Header (hidden on completion screen) */}
      {lessonPhase !== 'complete' && (
        <View style={styles.header}>
          <Pressable
            onPress={handleExit}
            style={styles.closeButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="पाठ बंद करें"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={styles.closeButton} />
        </View>
      )}

      {/* Content */}
      {lessonPhase === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      )}

      {lessonPhase === 'teach' && payload && (
        <TeachScreen
          teach={payload.teach}
          onComplete={handleTeachComplete}
        />
      )}

      {lessonPhase === 'puzzles' && payload && (
        <PuzzlePlayer
          practice={payload.practice}
          subStageId={payload.sub_stage_id}
          onComplete={handlePuzzlesComplete}
        />
      )}

      {lessonPhase === 'complete' && completionResult && (
        <CompletionScreen
          result={completionResult}
          title={payload?.title_l1 ?? lessonId}
          onReturn={handleReturn}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D8',
  },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 18, color: '#555', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Completion
  completionRoot: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  completionEmoji: { fontSize: 64 },
  completionTitle: {
    fontSize: 22, fontWeight: '800', color: '#1A1A2E',
    textAlign: 'center', lineHeight: 30,
  },
  completionMastery: { fontSize: 16, color: '#4A90D9', fontWeight: '600' },
  completionPoints: { fontSize: 18, fontWeight: '700', color: '#34C759' },
  returnButton: {
    backgroundColor: '#4A90D9', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
    marginTop: 16,
  },
  returnButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

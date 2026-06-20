import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import type {
  AnyPracticeItem,
  ListenAndRespondPuzzle,
  SpeakThePicturePuzzle,
  RepetitionDrillPuzzle,
  RolePlayTurnPuzzle,
  SubstageCompleteResponse,
} from '../../api/endpoints';
import { api } from '../../api';
import { speechModule } from '../../speech/SpeechModule';
import type { SpeechState } from '../../speech/SpeechModule';
import { insertSyncRow, markSynced } from '../../db/sync';
import { LESSON } from '../../copy/lesson';
import { generateUUID } from './uuid';
import { Waveform } from './Waveform';
import { ListenAndRespond } from './renderers/ListenAndRespond';
import { SpeakThePicture } from './renderers/SpeakThePicture';
import { RepetitionDrill } from './renderers/RepetitionDrill';
import { RolePlayTurn } from './renderers/RolePlayTurn';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'listening' | 'processing' | 'verdict';

interface Verdict {
  correct: boolean;
  awardBase: number;
  awardVoiceBonus: number;
  feedback_l1: string;
  inputType: 'voice' | 'text' | 'tap';
  transcript: string | null;
  isNetworkError: boolean;
}

function resolvePuzzleId(p: AnyPracticeItem, fallback: string): string {
  return (p as { id?: string }).id ?? fallback;
}

// ── Renderer switch ───────────────────────────────────────────────────────────

function PuzzleContent({
  puzzle,
  showPostFeedback,
}: {
  puzzle: AnyPracticeItem;
  showPostFeedback: boolean;
}) {
  switch (puzzle.type) {
    case 'listen_and_respond':
      return <ListenAndRespond puzzle={puzzle as ListenAndRespondPuzzle} />;
    case 'speak_the_picture':
      return <SpeakThePicture puzzle={puzzle as SpeakThePicturePuzzle} />;
    case 'repetition_drill':
      return <RepetitionDrill puzzle={puzzle as RepetitionDrillPuzzle} />;
    case 'role_play_turn':
      return (
        <RolePlayTurn
          puzzle={puzzle as RolePlayTurnPuzzle}
          postFeedbackVisible={showPostFeedback}
        />
      );
    default:
      console.warn('[PuzzlePlayer] Unknown puzzle type:', puzzle.type);
      return null;
  }
}

// ── Shell ─────────────────────────────────────────────────────────────────────

interface Props {
  practice: AnyPracticeItem[];
  subStageId: string;
  onComplete: (result: SubstageCompleteResponse) => void;
}

export function PuzzlePlayer({ practice, subStageId, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [silenceCount, setSilenceCount] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completingError, setCompletingError] = useState(false);

  // Ref for "did we get a transcript in the current recording session?"
  // Used to distinguish genuine silence (no transcript) from stop-after-submit.
  const gotTranscriptRef = useRef(false);
  // Idempotency key — generated once per puzzle on first submit, reused on retry.
  const pendingKeyRef = useRef<string | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-current phase readable in event handlers without stale-closure risk.
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const puzzle = practice[index];
  const isLast = index === practice.length - 1;

  // ── Submit attempt ──────────────────────────────────────────────────────────

  const submitAttempt = useCallback(
    async (inputType: 'voice' | 'text' | 'tap', text: string) => {
      // Guard against duplicate submissions (e.g. rapid taps)
      if (phaseRef.current === 'processing' || phaseRef.current === 'verdict') return;

      // Stop any ongoing recording immediately
      speechModule.stopListening();

      // Generate idempotency key once; reuse on retry for the same puzzle.
      if (!pendingKeyRef.current) {
        pendingKeyRef.current = generateUUID();
      }
      const key = pendingKeyRef.current;
      const pid = resolvePuzzleId(puzzle, `${subStageId}_${index}`);
      const body = {
        puzzle_id:       pid,
        sub_stage_id:    subStageId,
        transcript:      inputType === 'voice' ? text : null,
        input_type:      inputType,
        used_voice:      inputType === 'voice',
        idempotency_key: key,
      };

      // Persist to sync_queue BEFORE the network call — attempt is safe even if offline.
      await insertSyncRow({
        idempotency_key: key,
        puzzle_id:       pid,
        sub_stage_id:    subStageId,
        transcript:      body.transcript,
        input_type:      inputType,
        payload_json:    JSON.stringify(body),
      });

      setPhase('processing');

      try {
        const { data } = await api.lesson.submitResult(body);
        await markSynced(key);
        setVerdict({
          correct:          data.correct,
          awardBase:        data.award?.base ?? 0,
          awardVoiceBonus:  data.award?.voice_bonus ?? 0,
          feedback_l1:
            data.feedback_l1 ??
            (data.correct ? LESSON.speech.correct : LESSON.speech.incorrect),
          inputType,
          transcript:       body.transcript,
          isNetworkError:   false,
        });
      } catch {
        // Network error — attempt already persisted; F6 will drain it.
        setVerdict({
          correct:          false,
          awardBase:        0,
          awardVoiceBonus:  0,
          feedback_l1:      LESSON.speech.saved,
          inputType,
          transcript:       body.transcript,
          isNetworkError:   true,
        });
      }
      setPhase('verdict');
    },
    [puzzle, subStageId, index],
  );

  // ── Speech module subscriptions ─────────────────────────────────────────────
  // Re-subscribe whenever submitAttempt changes (i.e. when puzzle advances).

  useEffect(() => {
    const onLevel = (v: number) => setLevel(v);

    const onTranscript = (text: string, isFinal: boolean) => {
      if (!isFinal || !text.trim()) return;
      // Mark that this recording session produced speech before we stop it.
      gotTranscriptRef.current = true;
      submitAttempt('voice', text.trim());
    };

    // SpeechModule emits 'stateChange' when recognition ends (idle) or starts (listening).
    // We use this instead of the raw 'end' event to detect silence.
    const onStateChange = (state: SpeechState) => {
      if (state === 'idle') {
        setLevel(0);
        if (phaseRef.current === 'listening' && !gotTranscriptRef.current) {
          // Recording ended with no speech — genuine silence.
          setPhase('idle');
          setSilenceCount((prev) => {
            const next = prev + 1;
            if (next >= 2) setShowFallback(true);
            return next;
          });
        }
        // Reset for the next recording session.
        gotTranscriptRef.current = false;
      }
    };

    const onError = () => {
      setLevel(0);
      gotTranscriptRef.current = false;
      if (phaseRef.current === 'listening') {
        setPhase('idle');
        setShowFallback(true);
      }
    };

    speechModule.on('level', onLevel);
    speechModule.on('transcript', onTranscript);
    speechModule.on('stateChange', onStateChange);
    speechModule.on('error', onError);

    return () => {
      speechModule.off('level', onLevel);
      speechModule.off('transcript', onTranscript);
      speechModule.off('stateChange', onStateChange);
      speechModule.off('error', onError);
    };
  }, [submitAttempt]);

  // ── Auto-start mic 1s after each new puzzle appears ─────────────────────────

  useEffect(() => {
    if (phase !== 'idle' || showFallback) return;

    autoStartTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== 'idle') return;
      gotTranscriptRef.current = false;
      speechModule.startListening().then(() => {
        // Guard: only enter 'listening' if the module actually started.
        // startListening() resolves even on permission denial.
        if (phaseRef.current === 'idle' && speechModule.getState() === 'listening') {
          setPhase('listening');
        }
      });
    }, 1000);

    return () => {
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
    };
    // Re-arm only on genuine state or puzzle changes — not just showFallback toggling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  // Stop mic when component unmounts (e.g. user exits lesson)
  useEffect(() => {
    return () => {
      speechModule.stopListening();
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
    };
  }, []);

  // ── Manual mic toggle ───────────────────────────────────────────────────────

  const handleMicPress = useCallback(() => {
    if (phase === 'listening') {
      speechModule.stopListening();
    } else if (phase === 'idle') {
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
      gotTranscriptRef.current = false;
      speechModule.startListening().then(() => {
        if (phaseRef.current === 'idle' && speechModule.getState() === 'listening') {
          setPhase('listening');
        }
      });
    }
  }, [phase]);

  // ── Advance after verdict ───────────────────────────────────────────────────

  const handleNext = useCallback(async () => {
    if (isLast) {
      console.log('[PuzzlePlayer] submitting substage/complete for', subStageId);
      setCompleting(true);
      setCompletingError(false);
      try {
        const { data } = await api.lesson.completeSubstage({ sub_stage_id: subStageId });
        console.log('[PuzzlePlayer] substage/complete response:', JSON.stringify(data));
        onComplete(data);
      } catch (err: any) {
        console.error(
          '[PuzzlePlayer] substage/complete failed:',
          err?.message,
          err?.response?.status,
        );
        setCompletingError(true);
        setCompleting(false);
      }
    } else {
      pendingKeyRef.current = null;  // fresh key for the next puzzle
      setSilenceCount(0);
      setShowFallback(false);
      setFallbackText('');
      setVerdict(null);
      setIndex((i) => i + 1);
      setPhase('idle');
    }
  }, [isLast, subStageId, onComplete]);

  // ── Fallback type ───────────────────────────────────────────────────────────

  const tapOptions: string[] =
    (puzzle?.type === 'speak_the_picture' || puzzle?.type === 'listen_and_respond')
      ? ((puzzle as SpeakThePicturePuzzle | ListenAndRespondPuzzle).fallback?.options ?? [])
      : [];
  const useTapFallback = showFallback && tapOptions.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!puzzle) return null;

  const showWaveform = (phase === 'idle' || phase === 'listening') && !showFallback;

  return (
    <View style={styles.root}>
      {/* Progress strip */}
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {LESSON.puzzle.progress(index + 1, practice.length)}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / practice.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Puzzle-specific content (thin renderer) */}
        <View style={styles.puzzleCard}>
          <PuzzleContent
            puzzle={puzzle}
            showPostFeedback={phase === 'verdict' && !(verdict?.isNetworkError)}
          />
        </View>

        {/* Waveform hero */}
        {showWaveform && (
          <View style={styles.waveformArea}>
            <Waveform active={phase === 'listening'} level={level} />
          </View>
        )}

        {/* State labels */}
        {phase === 'idle' && !showFallback && (
          <Text style={styles.hint}>{LESSON.speech.micHint}</Text>
        )}
        {phase === 'listening' && (
          <Text style={styles.hint}>{LESSON.speech.listening}</Text>
        )}
        {phase === 'processing' && (
          <View style={styles.processingRow}>
            <ActivityIndicator color="#4A90D9" />
            <Text style={styles.hint}>{LESSON.speech.processing}</Text>
          </View>
        )}

        {/* Silence nudge (after 1st silence, before fallback appears) */}
        {silenceCount === 1 && phase === 'idle' && !showFallback && (
          <Text style={styles.nudge}>{LESSON.speech.silent}</Text>
        )}

        {/* Mic button */}
        {showWaveform && (
          <Pressable
            onPress={handleMicPress}
            style={({ pressed }) => [
              styles.micButton,
              phase === 'listening' && styles.micButtonActive,
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={phase === 'listening' ? 'रिकॉर्डिंग रोकें' : 'बोलें'}
          >
            <Text style={styles.micIcon}>
              {phase === 'listening' ? LESSON.speech.micButtonStop : LESSON.speech.micButton}
            </Text>
          </Pressable>
        )}

        {/* Fallback: tap options */}
        {useTapFallback && phase !== 'processing' && phase !== 'verdict' && (
          <View style={styles.fallbackArea}>
            <Text style={styles.fallbackHint}>{LESSON.puzzle.tapFallbackHint}</Text>
            {tapOptions.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => submitAttempt('tap', opt)}
                style={styles.tapOption}
              >
                <Text style={styles.tapOptionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Fallback: text input */}
        {showFallback && !useTapFallback && phase !== 'processing' && phase !== 'verdict' && (
          <View style={styles.fallbackArea}>
            <Text style={styles.fallbackHint}>{LESSON.speech.suggestFallback}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={LESSON.puzzle.textPlaceholder}
              placeholderTextColor="#BBB"
              value={fallbackText}
              onChangeText={setFallbackText}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (fallbackText.trim()) submitAttempt('text', fallbackText.trim());
              }}
            />
            <Pressable
              onPress={() => {
                if (fallbackText.trim()) submitAttempt('text', fallbackText.trim());
              }}
              style={styles.submitButton}
            >
              <Text style={styles.submitText}>{LESSON.puzzle.submitButton}</Text>
            </Pressable>
          </View>
        )}

        {/* Verdict card */}
        {phase === 'verdict' && verdict && (
          <View style={[
            styles.verdictCard,
            verdict.correct && styles.verdictCorrect,
            verdict.isNetworkError && styles.verdictOffline,
          ]}>
            {/* "मैंने सुना" — always for voice attempts, even on incorrect */}
            {verdict.inputType === 'voice' && verdict.transcript && (
              <Text style={styles.heard}>{LESSON.speech.heard(verdict.transcript)}</Text>
            )}

            <Text style={styles.verdictText}>{verdict.feedback_l1}</Text>

            {verdict.correct && verdict.awardBase > 0 && (
              <Text style={styles.points}>+{verdict.awardBase} अंक मिले!</Text>
            )}
            {verdict.correct && verdict.awardVoiceBonus > 0 && (
              <Text style={styles.voiceBonus}>
                {LESSON.speech.voiceBonus(verdict.awardVoiceBonus)}
              </Text>
            )}

            {/* Last-puzzle completion button — three states */}
            {isLast ? (
              completing ? (
                <ActivityIndicator color="#4A90D9" style={{ marginTop: 8 }} />
              ) : completingError ? (
                <View style={styles.completeErrorBox}>
                  <Text style={styles.completeErrorText}>
                    कुछ गड़बड़ हुई — दोबारा कोशिश करें
                  </Text>
                  <Pressable onPress={handleNext} style={styles.nextButton}>
                    <Text style={styles.nextButtonText}>दोबारा कोशिश करें</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={handleNext} style={styles.nextButton}>
                  <Text style={styles.nextButtonText}>पाठ पूरा करें ✓</Text>
                </Pressable>
              )
            ) : (
              <Pressable onPress={handleNext} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>{LESSON.puzzle.nextButton}</Text>
              </Pressable>
            )}

            {/* Retry: only when incorrect AND not an offline verdict AND not on last puzzle */}
            {!verdict.correct && !verdict.isNetworkError && (
              <Pressable
                onPress={() => {
                  // Reset to idle so mic re-opens; keep idempotency key for retry.
                  setVerdict(null);
                  setSilenceCount(0);
                  setShowFallback(false);
                  setFallbackText('');
                  setPhase('idle');
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>{LESSON.puzzle.retryButton}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressText: { fontSize: 12, color: '#888', minWidth: 36, textAlign: 'center' },
  progressBar: {
    flex: 1, height: 4, backgroundColor: '#E0D8CE', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 2 },

  scroll: { padding: 20, paddingBottom: 40, gap: 20 },

  puzzleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  waveformArea: { marginVertical: 4 },

  processingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },

  hint: { fontSize: 15, color: '#666', textAlign: 'center' },

  nudge: {
    fontSize: 14, color: '#C8860A', textAlign: 'center',
    backgroundColor: '#FFF8E7', borderRadius: 8, padding: 10,
  },

  micButton: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4A90D9', alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4A90D9', shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  micButtonActive: { backgroundColor: '#FF6B35', shadowColor: '#FF6B35' },
  micIcon: { fontSize: 28 },

  fallbackArea: { gap: 12 },
  fallbackHint: { fontSize: 14, color: '#888', textAlign: 'center' },

  tapOption: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1.5, borderColor: '#4A90D9', alignItems: 'center',
  },
  tapOptionText: { fontSize: 15, fontWeight: '600', color: '#4A90D9' },

  textInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#DDD', padding: 14, fontSize: 15, color: '#1A1A2E',
  },
  submitButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  verdictCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    gap: 12, borderLeftWidth: 4, borderLeftColor: '#DDD',
  },
  verdictCorrect: { borderLeftColor: '#34C759', backgroundColor: '#F0FFF4' },
  verdictOffline: { borderLeftColor: '#C8860A', backgroundColor: '#FFFBF0' },

  heard: { fontSize: 14, color: '#555', fontStyle: 'italic' },
  verdictText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', lineHeight: 24 },
  points: { fontSize: 15, fontWeight: '700', color: '#34C759' },
  voiceBonus: { fontSize: 13, color: '#4A90D9', fontWeight: '600' },

  nextButton: {
    backgroundColor: '#4A90D9', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  retryButton: { paddingVertical: 10, alignItems: 'center' },
  retryText: { fontSize: 14, color: '#888', textDecorationLine: 'underline' },

  completeErrorBox: { gap: 10 },
  completeErrorText: {
    fontSize: 14, color: '#C8860A', textAlign: 'center',
    backgroundColor: '#FFF8E7', borderRadius: 8, padding: 10,
  },
});

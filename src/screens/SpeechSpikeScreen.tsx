import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { speechModule, SpeechState } from '../speech/SpeechModule';

const BAR_COUNT = 20;

export function SpeechSpikeScreen() {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const bars = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.1))).current;
  const levelRef = useRef(0);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onState = (s: SpeechState) => setState(s);
    const onTranscript = (text: string) => {
      setTranscript(text);
      setError('');
    };
    const onError = (msg: string) => setError(msg);
    const onLevel = (v: number) => {
      levelRef.current = v;
    };

    speechModule.on('stateChange', onState);
    speechModule.on('transcript', onTranscript);
    speechModule.on('error', onError);
    speechModule.on('level', onLevel);

    return () => {
      speechModule.off('stateChange', onState);
      speechModule.off('transcript', onTranscript);
      speechModule.off('error', onError);
      speechModule.off('level', onLevel);
    };
  }, []);

  // Animate waveform bars off the current level
  useEffect(() => {
    let active = true;
    const animate = () => {
      if (!active) return;
      const level = levelRef.current;
      bars.forEach((bar, i) => {
        // Each bar oscillates around the current level with random phase
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const target =
          state === 'listening'
            ? Math.max(0.05, level * (0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 200 + phase))))
            : 0.05;
        Animated.timing(bar, {
          toValue: target,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
      animFrameRef.current = setTimeout(animate, 100);
    };
    animate();
    return () => {
      active = false;
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, [state]);

  const toggle = () => {
    if (state === 'listening') {
      speechModule.stopListening();
    } else {
      setTranscript('');
      setError('');
      speechModule.startListening();
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.heading}>F1 Speech Spike</Text>
      <Text style={styles.sub}>भाषा: en-IN • SDK: expo-speech-recognition</Text>

      {/* Waveform */}
      <View style={styles.waveform}>
        {bars.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 80],
                }),
                backgroundColor: state === 'listening' ? '#FF6B35' : '#B0C4DE',
              },
            ]}
          />
        ))}
      </View>

      {/* Mic button */}
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.micButton,
          state === 'listening' && styles.micButtonActive,
          pressed && styles.micButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={state === 'listening' ? 'बोलना बंद करें' : 'बोलना शुरू करें'}
      >
        <Text style={styles.micIcon}>{state === 'listening' ? '🛑' : '🎤'}</Text>
        <Text style={styles.micLabel}>
          {state === 'listening' ? 'रुकें' : 'बोलिए'}
        </Text>
      </Pressable>

      {/* Status */}
      <Text style={styles.statusLabel}>
        {state === 'listening' ? '🔴 सुन रहे हैं…' : '⚪ तैयार'}
      </Text>

      {/* Transcript */}
      {transcript.length > 0 && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>मैंने सुना:</Text>
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        </View>
      )}

      {/* Error */}
      {error.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
    alignItems: 'center',
    paddingTop: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: '#666',
    marginBottom: 32,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 90,
    marginBottom: 40,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  micButtonActive: {
    backgroundColor: '#E63946',
  },
  micButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  micIcon: {
    fontSize: 36,
  },
  micLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 15,
    color: '#444',
    marginBottom: 24,
  },
  transcriptBox: {
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90D9',
    width: '85%',
  },
  transcriptLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
    width: '85%',
  },
  errorText: {
    fontSize: 14,
    color: '#C0392B',
  },
});

/**
 * Single speech abstraction — the entire app talks only to this module.
 * Primary: expo-speech-recognition (locale en-IN)
 * Events: onTranscript(text, isFinal), onLevel(0–1), onError(msg), onStateChange
 */

import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionNativeEventMap,
} from 'expo-speech-recognition';
import { EventEmitter } from 'eventemitter3';
import { Alert } from 'react-native';

export type SpeechState = 'idle' | 'listening';

export interface SpeechEvents {
  transcript: (text: string, isFinal: boolean) => void;
  level: (value: number) => void;
  error: (message: string) => void;
  stateChange: (state: SpeechState) => void;
}

class SpeechModule extends EventEmitter<SpeechEvents> {
  private state: SpeechState = 'idle';
  private subscriptions: Array<{ remove(): void }> = [];

  private setState(s: SpeechState) {
    this.state = s;
    this.emit('stateChange', s);
  }

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'माइक की अनुमति',
          'माइक की अनुमति चाहिए — सेटिंग्स में जाकर ऑन करें',
          [{ text: 'ठीक है' }],
        );
        return false;
      }
      return true;
    } catch {
      Alert.alert(
        'माइक की अनुमति',
        'माइक की अनुमति चाहिए — सेटिंग्स में जाकर ऑन करें',
        [{ text: 'ठीक है' }],
      );
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.state === 'listening') return;

    const granted = await this.requestPermission();
    if (!granted) {
      this.emit('error', 'माइक्रोफोन की अनुमति नहीं मिली।');
      return;
    }

    this.subscriptions.push(
      ExpoSpeechRecognitionModule.addListener(
        'result',
        (evt: ExpoSpeechRecognitionNativeEventMap['result']) => {
          const best = evt.results?.[0]?.transcript ?? '';
          if (best) this.emit('transcript', best, evt.isFinal);
        },
      ),
      ExpoSpeechRecognitionModule.addListener(
        'error',
        (evt: ExpoSpeechRecognitionNativeEventMap['error']) => {
          if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
            Alert.alert(
              'माइक की अनुमति',
              'माइक की अनुमति चाहिए — सेटिंग्स में जाकर ऑन करें',
              [{ text: 'ठीक है' }],
            );
          } else {
            this.emit('error', evt.message ?? 'Speech error');
          }
          this.cleanup();
        },
      ),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        this.cleanup();
      }),
      ExpoSpeechRecognitionModule.addListener(
        'volumechange',
        (evt: ExpoSpeechRecognitionNativeEventMap['volumechange']) => {
          // rmsdB typically -2 to 10; normalise to 0–1
          const db: number = evt.value ?? 0;
          const normalised = Math.min(1, Math.max(0, (db + 2) / 12));
          this.emit('level', normalised);
        },
      ),
    );

    ExpoSpeechRecognitionModule.start({
      lang: 'en-IN',
      interimResults: true,
      continuous: false,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });

    this.setState('listening');
  }

  stopListening(): void {
    if (this.state !== 'listening') return;
    ExpoSpeechRecognitionModule.stop();
    this.cleanup();
  }

  private cleanup() {
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];
    this.emit('level', 0);
    this.setState('idle');
  }

  getState(): SpeechState {
    return this.state;
  }
}

export const speechModule = new SpeechModule();

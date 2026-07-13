import React, { useEffect, useRef } from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';

import { store, persistor } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initDatabase } from './src/db/schema';
import { drain } from './src/sync/drain';

export default function App() {
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubNetInfo: ReturnType<typeof NetInfo.addEventListener> | null = null;
    let sub: ReturnType<typeof AppState.addEventListener> | null = null;

    (async () => {
      try {
        await initDatabase();
      } catch (e) {
        // Not fatal downstream — getPendingRows() already returns [] on a
        // missing-table error — but this is a chase-it signal, log loudly.
        console.error('[App] initDatabase failed — sync queue may be unavailable this session', e);
      }

      if (cancelled) return;

      // Cold-start / kill-and-relaunch coverage: AppState never fires a
      // change→active event on cold launch (already 'active' at mount —
      // confirmed from RN's AppState source), so this is the only path that
      // drains rows queued before this launch. drain()'s own mutex makes the
      // very next NetInfo/AppState firing immediately after a safe no-op.
      drain();

      // NetInfo: drain when connection flips false → true (covers in-foreground reconnect).
      unsubNetInfo = NetInfo.addEventListener((state) => {
        const connected = state.isConnected === true;
        if (!prevConnected.current && connected) {
          drain();
        }
        prevConnected.current = connected;
      });

      // AppState: drain when app returns to foreground (covers pocket-and-reopen).
      const handleAppState = (nextState: AppStateStatus) => {
        if (nextState === 'active') drain();
      };
      sub = AppState.addEventListener('change', handleAppState);
    })();

    return () => {
      cancelled = true;
      unsubNetInfo?.();
      sub?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          {/* PersistGate blocks render until redux-persist rehydration completes */}
          <PersistGate
            loading={<View style={{ flex: 1, backgroundColor: '#F5F0EB' }} />}
            persistor={persistor}
          >
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

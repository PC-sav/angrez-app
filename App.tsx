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
    initDatabase();
  }, []);

  useEffect(() => {
    // NetInfo: drain when connection flips false → true (covers in-foreground reconnect).
    const unsubNetInfo = NetInfo.addEventListener((state) => {
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
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      unsubNetInfo();
      sub.remove();
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

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { mergeUser, setLoggedIn, logout } from '../store/slices/userSlice';
import { setBootstrapped } from '../store/slices/uiSlice';
import { getToken, clearToken, api } from '../api';

export function Bootstrap() {
  const dispatch = useAppDispatch();
  const hasPersistedUser = useAppSelector((state) => state.user.isLoggedIn);

  useEffect(() => {
    async function run() {
      const token = await getToken();
      console.log('[Bootstrap] SecureStore token found:', !!token);

      if (!token) {
        if (hasPersistedUser) dispatch(logout());
        dispatch(setBootstrapped());
        return;
      }

      try {
        const { data, status } = await api.auth.me();
        console.log('[Bootstrap] /auth/me status:', status);
        dispatch(mergeUser(data));
        dispatch(setLoggedIn());
      } catch (err: any) {
        const status: number = err?.response?.status ?? 0;
        // Server may nest the code as data.code or data.error.code
        const code: string =
          err?.response?.data?.code ??
          err?.response?.data?.error?.code ??
          '';
        console.log('[Bootstrap] /auth/me error — status:', status, 'code:', code || '(none)');

        if (status === 401 || code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED') {
          // Explicit rejection: response interceptor may have already fired logout(),
          // but ensure token is cleared regardless.
          await clearToken();
          dispatch(logout());
        } else {
          // 503 / timeout / offline: local-first — trust persisted session.
          // Re-assert setLoggedIn() because the response interceptor may have
          // dispatched logout() before this catch block ran.
          if (hasPersistedUser) dispatch(setLoggedIn());
        }
      } finally {
        dispatch(setBootstrapped());
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#4A90D9" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

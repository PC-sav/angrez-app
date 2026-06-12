import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.angrez.app';
const TIMEOUT_MS = 10_000;
export const TOKEN_KEY = 'jwt_token';

// ── Token helpers ────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // SecureStore unavailable or read error — treat as logged out
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    console.warn('[SecureStore] save failed');
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore — token may already be absent
  }
}

// ── Axios instance ───────────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
});

// Request: attach Bearer token from SecureStore
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth-error mutex ─────────────────────────────────────────────────────────
// Concurrent 401s all await the same promise so logout fires exactly once.

let logoutPromise: Promise<void> | null = null;

function triggerLogout(): Promise<void> {
  if (!logoutPromise) {
    logoutPromise = (async () => {
      await clearToken();
      // Lazy-require avoids a circular-import at module load time
      const { store } = require('../store') as typeof import('../store');
      const { logout } = require('../store/slices/userSlice') as typeof import('../store/slices/userSlice');
      store.dispatch(logout());
      Alert.alert('Session समाप्त', 'Phir se login karein', [{ text: 'ठीक है' }]);
    })().finally(() => {
      logoutPromise = null;
    });
  }
  return logoutPromise;
}

// ── Response interceptor ─────────────────────────────────────────────────────

type RetryConfig = InternalAxiosRequestConfig & {
  _retryCount?: number;
  _retryStart?: number;
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig;

    // INVALID_TOKEN: silent logout, mutex so concurrent 401s await one promise
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'INVALID_TOKEN'
    ) {
      await triggerLogout();
      return Promise.reject(error);
    }

    // 503: retry honouring Retry-After, max 3 retries, 30s total ceiling
    if (error.response?.status === 503) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      config._retryStart = config._retryStart ?? Date.now();
      const elapsed = Date.now() - config._retryStart;

      if (config._retryCount <= 3 && elapsed < 30_000) {
        const retryAfterSec = parseInt(
          error.response.headers?.['retry-after'] ?? '1',
          10,
        );
        const delay = Math.min(retryAfterSec * 1000, 30_000 - elapsed);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        return client(config);
      }
      // Ceiling exceeded — queue silently, caller is unaware
      return Promise.resolve({ data: null, status: 503 });
    }

    // 500: no retry, propagate so callers can queue locally
    // timeout/offline: not user-facing, local-first covers it
    return Promise.reject(error);
  },
);

export default client;

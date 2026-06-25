import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { File, Directory, Paths } from 'expo-file-system';

import type { MainStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { api, resolveAsset } from '../../api';
import type { NextPlanResponse } from '../../api/endpoints';
import {
  getCurrentPlan, upsertContentPack, refreshCurrentPlan,
  upsertAssetCache, getAssetByPath,
} from '../../db/content';
import type { CurrentPlanRow } from '../../db/content';
import { MAIN } from '../../copy/main';

type Nav = NativeStackNavigationProp<MainStackParamList>;

// ── Asset helpers ─────────────────────────────────────────────────────────────

function extractAssetPaths(plan: NextPlanResponse): string[] {
  const paths: string[] = [];
  for (const item of plan.teach ?? []) {
    if (item.audio) paths.push(item.audio);
    if (item.prompt_audio) paths.push(item.prompt_audio);
    for (const r of item.responses ?? []) {
      if (r.audio) paths.push(r.audio as string);
    }
  }
  for (const item of plan.practice ?? []) {
    if (item.audio) paths.push(item.audio);
    if (item.image) paths.push(item.image);
    if (item.ai_line_audio) paths.push(item.ai_line_audio);
  }
  return [...new Set(paths)];
}

async function downloadAssets(
  plan: NextPlanResponse,
  onProgress: (pct: number) => void,
): Promise<void> {
  const paths = extractAssetPaths(plan);
  if (paths.length === 0) return;

  const assetsDir = new Directory(Paths.document, 'assets');
  if (!assetsDir.exists) assetsDir.create();

  let done = 0;
  for (const remotePath of paths) {
    done++;
    const existing = await getAssetByPath(remotePath);
    if (existing?.status === 'downloaded') {
      onProgress(Math.round((done / paths.length) * 100));
      continue;
    }

    try {
      const url = resolveAsset(remotePath);
      const destFile = new File(assetsDir, encodeURIComponent(remotePath));
      const downloaded = await File.downloadFileAsync(url, destFile, { idempotent: true });
      await upsertAssetCache({
        remote_path: remotePath,
        local_uri: downloaded.uri,
        status: 'downloaded',
        bytes: downloaded.size ?? null,
        cached_at: '',
      });
    } catch (dlErr) {
      // Log but don't rethrow — a failed download is non-fatal.
      // upsertAssetCache is guarded internally; skip if remotePath is bad.
      console.warn('[GharScreen] asset download failed, skipping cache write:', dlErr);
    }
    onProgress(Math.round((done / paths.length) * 100));
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function GharScreen() {
  const navigation = useNavigation<Nav>();
  const userName = useAppSelector((s) => s.user.name);

  const [plan, setPlan] = useState<CurrentPlanRow | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function run() {
        // 1. Render from cache immediately — guarded so a SQLite failure
        //    never escapes run() as an unhandled rejection.
        let cached: CurrentPlanRow | null = null;
        try {
          cached = await getCurrentPlan();
        } catch (e) {
          console.warn('[GharScreen] failed to read cached plan:', e);
        }
        if (cancelled) return;
        setPlan(cached);
        setInitialLoading(!cached);

        // 2. Background refresh — never block on this
        try {
          const packsResp = await api.content.packs();
          if (cancelled) return;

          // Upsert packs (replace on higher version)
          for (const pack of packsResp.data.packs) {
            await upsertContentPack(pack);
          }

          const freshPlan = await refreshCurrentPlan();
          if (cancelled) return;
          setInitialLoading(false);

          if (freshPlan && 'locked' in freshPlan) {
            navigation.navigate('Paywall', { next_available_at: freshPlan.next_available_at });
          } else if (freshPlan) {
            setPlan(freshPlan);
            // 3. Download assets for current sub-stage (non-blocking, progress shown on card)
            if (freshPlan.payload_json) {
              setDownloadPct(0);
              const planData = JSON.parse(freshPlan.payload_json) as NextPlanResponse;
              await downloadAssets(planData, (pct) => {
                if (!cancelled) setDownloadPct(pct);
              });
              if (!cancelled) setDownloadPct(null);
            }
          }

        } catch (e) {
          console.warn('[GharScreen] background refresh failed:', e);
          // Network failed — keep whatever cache we have; never show an error over it
          if (!cancelled) setInitialLoading(false);
        }
      }

      run();
      return () => { cancelled = true; };
    }, []),
  );

  function openLesson() {
    if (!plan) return;
    navigation.navigate('LessonModal', { lessonId: plan.sub_stage_id });
  }

  // Show minimal loading state only when there's no cache at all
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>{MAIN.ghar.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel =
    plan
      ? (MAIN.ghar.statusMap[plan.status] ?? MAIN.ghar.statusFallback)
      : '';
  const masteryPct = plan ? Math.round(plan.mastery_score * 100) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>{MAIN.ghar.greeting(userName)}</Text>

        {/* Lesson card */}
        {plan ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{plan.title_l1}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{statusLabel}</Text>
              </View>
            </View>

            <Text style={styles.cardSubtitle}>{plan.micro_skill_l1}</Text>

            {masteryPct > 0 && (
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${masteryPct}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {MAIN.ghar.masteryLabel(plan.mastery_score)}
                </Text>
              </View>
            )}

            {/* Non-blocking download progress */}
            {downloadPct !== null && (
              <Text style={styles.downloadText}>
                {downloadPct < 100
                  ? MAIN.ghar.downloadProgress(downloadPct)
                  : MAIN.ghar.downloadDone}
              </Text>
            )}

            <Pressable style={styles.startButton} onPress={openLesson}>
              <Text style={styles.startButtonText}>{MAIN.ghar.startButton}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>{MAIN.ghar.errorNoCache}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#F5F0EB' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: '#888' },
  scroll:   { padding: 24, paddingBottom: 48 },

  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 24,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 28,
  },
  statusPill: {
    backgroundColor: '#EEF5FD',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '600', color: '#4A90D9' },

  cardSubtitle: { fontSize: 14, color: '#666', lineHeight: 20 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 2 },
  progressLabel: { fontSize: 12, color: '#888' },

  downloadText: { fontSize: 12, color: '#888', fontStyle: 'italic' },

  startButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

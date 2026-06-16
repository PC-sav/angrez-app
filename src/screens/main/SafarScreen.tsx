import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/types';
import {
  getContentPacks, getCurrentPlan, getSubstageProgress,
} from '../../db/content';
import type { ContentPackRow, CurrentPlanRow, SubstageProgressRow } from '../../db/content';
import { MAIN } from '../../copy/main';

type Nav = NativeStackNavigationProp<MainStackParamList>;

// ── Node state ─────────────────────────────────────────────────────────────────

type NodeState = 'completed' | 'current' | 'locked';

interface Node {
  id: string;      // e.g. "1.3"
  state: NodeState;
  title_l1: string | null;  // real title for completed/current; null for locked
}

/**
 * Derive a node id from stage number + 1-based position.
 * Contract v1 uses the "{stage}.{position}" format (gate check confirmed: "1.1").
 */
function deriveNodeId(stage: number, position: number): string {
  return `${stage}.${position}`;
}

function buildNodes(
  pack: ContentPackRow,
  currentPlan: CurrentPlanRow | null,
  progressByStageId: Record<string, SubstageProgressRow>,
): Node[] {
  const nodes: Node[] = [];
  for (let pos = 1; pos <= pack.sub_stage_count; pos++) {
    const id = deriveNodeId(pack.stage, pos);
    if (id === currentPlan?.sub_stage_id) {
      nodes.push({ id, state: 'current', title_l1: currentPlan.title_l1 });
    } else if (progressByStageId[id]) {
      nodes.push({ id, state: 'completed', title_l1: progressByStageId[id].title_l1 });
    } else {
      nodes.push({ id, state: 'locked', title_l1: null });
    }
  }
  return nodes;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState('');

  const show = useCallback((msg: string) => {
    setMessage(msg);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [opacity]);

  const ToastEl = (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );

  return { show, ToastEl };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function SafarScreen() {
  const navigation = useNavigation<Nav>();
  const { show: showToast, ToastEl } = useToast();

  const [packs, setPacks] = useState<ContentPackRow[]>([]);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanRow | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, SubstageProgressRow>>({});

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [ps, cp, progress] = await Promise.all([
          getContentPacks(),
          getCurrentPlan(),
          getSubstageProgress(),
        ]);
        setPacks(ps);
        setCurrentPlan(cp);
        const map: Record<string, SubstageProgressRow> = {};
        for (const row of progress) map[row.sub_stage_id] = row;
        setProgressMap(map);
      }
      load();
    }, []),
  );

  function openLesson(subStageId: string) {
    navigation.navigate('LessonModal', { lessonId: subStageId });
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>सफ़र</Text>

        {packs.map((pack) => {
          const nodes = buildNodes(pack, currentPlan, progressMap);
          return (
            <View key={pack.stage} style={styles.stageSection}>
              <Text style={styles.stageHeader}>{pack.name_l1}</Text>

              {nodes.map((node, idx) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  isLast={idx === nodes.length - 1}
                  onPressCurrent={() => openLesson(node.id)}
                  onPressLocked={() => showToast(MAIN.safar.lockedToast)}
                />
              ))}
            </View>
          );
        })}

        {packs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              पाठ लोड हो रहे हैं — घर की स्क्रीन खोलें
            </Text>
          </View>
        )}
      </ScrollView>

      {ToastEl}
    </SafeAreaView>
  );
}

// ── NodeRow ────────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: Node;
  isLast: boolean;
  onPressCurrent: () => void;
  onPressLocked: () => void;
}

function NodeRow({ node, isLast, onPressCurrent, onPressLocked }: NodeRowProps) {
  const isCurrent   = node.state === 'current';
  const isCompleted = node.state === 'completed';
  const isLocked    = node.state === 'locked';

  const handlePress = isCurrent
    ? onPressCurrent
    : isLocked
      ? onPressLocked
      : undefined;

  return (
    <View style={styles.nodeRow}>
      {/* Connector line */}
      <View style={styles.connectorCol}>
        <View
          style={[
            styles.nodeDot,
            isCompleted && styles.nodeDotCompleted,
            isCurrent   && styles.nodeDotCurrent,
            isLocked    && styles.nodeDotLocked,
          ]}
        >
          {isCompleted && <Text style={styles.dotCheckmark}>✓</Text>}
          {isCurrent   && <View style={styles.dotInnerRing} />}
        </View>
        {!isLast && <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />}
      </View>

      {/* Card */}
      <Pressable
        style={[
          styles.nodeCard,
          isCurrent   && styles.nodeCardCurrent,
          isCompleted && styles.nodeCardCompleted,
          isLocked    && styles.nodeCardLocked,
        ]}
        onPress={handlePress}
        disabled={isCompleted}
      >
        <Text
          style={[
            styles.nodeLabel,
            isCompleted && styles.nodeLabelCompleted,
            isCurrent   && styles.nodeLabelCurrent,
            isLocked    && styles.nodeLabelLocked,
          ]}
          numberOfLines={2}
        >
          {isLocked
            ? MAIN.safar.lockedLabel(node.id)
            : node.title_l1}
        </Text>

        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{MAIN.safar.currentBadge}</Text>
          </View>
        )}
        {isCompleted && (
          <Text style={styles.completedNote}>{MAIN.safar.doneBadge} पूरा हुआ</Text>
        )}
      </Pressable>
    </View>
  );
}

const DOT = 20;
const CONNECTOR_W = 2;

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F5F0EB' },
  scroll:      { padding: 24, paddingBottom: 60 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 24 },

  stageSection: { marginBottom: 32 },
  stageHeader:  {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90D9',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D8',
  },

  nodeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },

  connectorCol: { width: 36, alignItems: 'center', paddingTop: 4 },
  nodeDot: {
    width: DOT, height: DOT, borderRadius: DOT / 2,
    backgroundColor: '#DDD',
    alignItems: 'center', justifyContent: 'center',
  },
  nodeDotCompleted: { backgroundColor: '#34C759' },
  nodeDotCurrent:   { backgroundColor: '#4A90D9', borderWidth: 3, borderColor: '#C8E0F8' },
  nodeDotLocked:    { backgroundColor: '#CCC' },

  dotCheckmark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dotInnerRing: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff',
  },

  connector: {
    width: CONNECTOR_W,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#DDD',
    marginTop: 2,
    marginBottom: 2,
  },
  connectorCompleted: { backgroundColor: '#34C759' },

  nodeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginLeft: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    gap: 4,
  },
  nodeCardCurrent:   { borderWidth: 2, borderColor: '#4A90D9', shadowOpacity: 0.10, elevation: 4 },
  nodeCardCompleted: { backgroundColor: '#F8FFF9' },
  nodeCardLocked:    { backgroundColor: '#F8F8F8' },

  nodeLabel:          { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  nodeLabelCurrent:   { color: '#1A1A2E' },
  nodeLabelCompleted: { color: '#555' },
  nodeLabelLocked:    { color: '#BBB', fontWeight: '400' },

  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF5FD',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#4A90D9' },

  completedNote: { fontSize: 12, color: '#34C759', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText:  { fontSize: 14, color: '#AAA', textAlign: 'center' },

  toast: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});

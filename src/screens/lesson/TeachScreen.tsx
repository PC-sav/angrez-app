import React, { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import type {
  TeachItemDetailed, TeachPhraseItem, TeachExchangeItem,
} from '../../api/endpoints';
import { AudioButton } from './AudioButton';
import { LESSON } from '../../copy/lesson';

// ── Immersion helper ──────────────────────────────────────────────────────────
// Renders en if present (Stage 3+) — falls back to l1 for Stages 1-2 where en is absent.
function textField(en: string | undefined, l1: string | undefined): string {
  return en ?? l1 ?? '';
}

// ── Phrase card ───────────────────────────────────────────────────────────────

function PhraseCard({ item }: { item: TeachPhraseItem }) {
  const primary = textField(item.en, item.l1);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.audio && <AudioButton remotePath={item.audio} size="large" />}
        <Text style={styles.phraseText}>{primary}</Text>
      </View>
      {item.l1_meaning && (
        <Text style={styles.meaning}>{item.l1_meaning}</Text>
      )}
      {item.l1_note && (
        <Text style={styles.note}>{item.l1_note}</Text>
      )}
      <Text style={styles.prompt}>{LESSON.teach.phrasePrompt}</Text>
    </View>
  );
}

// ── Exchange card ─────────────────────────────────────────────────────────────

function ExchangeCard({ item }: { item: TeachExchangeItem }) {
  const promptText = textField(item.prompt_en, item.prompt_l1);
  return (
    <View style={styles.card}>
      <Text style={styles.exchangeLabel}>{LESSON.teach.exchangePrompt}</Text>
      <View style={styles.promptRow}>
        {item.prompt_audio && <AudioButton remotePath={item.prompt_audio} />}
        {promptText.length > 0 && (
          <Text style={styles.exchangePrompt}>{promptText}</Text>
        )}
      </View>
      {(item.responses ?? []).map((resp, i) => {
        const respText = textField(resp.en, resp.l1);
        return (
          <View key={i} style={styles.responseRow}>
            {resp.audio && <AudioButton remotePath={resp.audio} />}
            <View style={styles.responseTexts}>
              <Text style={styles.responseText}>{respText}</Text>
              {resp.register_l1 && (
                <Text style={styles.register}>{resp.register_l1}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface Props {
  teach: TeachItemDetailed[];
  onComplete: () => void;
}

export function TeachScreen({ teach, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const item = teach[index];
  const isLast = index === teach.length - 1;

  const handleContinue = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (!item) {
    onComplete();
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{index + 1} / {teach.length}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / teach.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        key={index}
      >
        {item.type === 'phrase'
          ? <PhraseCard item={item as TeachPhraseItem} />
          : item.type === 'exchange'
            ? <ExchangeCard item={item as TeachExchangeItem} />
            : null}
      </ScrollView>

      <Pressable style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>
          {isLast ? 'अभ्यास शुरू करें →' : LESSON.teach.continueButton + ' →'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    minWidth: 36,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0D8CE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 2,
  },
  scroll: {
    padding: 20,
    paddingBottom: 12,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 16,
  },
  phraseText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 34,
  },
  meaning: {
    fontSize: 17,
    color: '#4A90D9',
    textAlign: 'center',
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  prompt: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    paddingTop: 12,
    marginTop: 4,
  },
  exchangeLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exchangePrompt: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F0EB',
  },
  responseTexts: {
    flex: 1,
    gap: 2,
  },
  responseText: {
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  register: {
    fontSize: 13,
    color: '#888',
  },
  continueButton: {
    margin: 20,
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

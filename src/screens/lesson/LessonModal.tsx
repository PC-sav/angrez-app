import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'LessonModal'>;
type Route = RouteProp<MainStackParamList, 'LessonModal'>;

function confirmExit(onConfirm: () => void) {
  Alert.alert(
    'पाठ छोड़ें?',
    'Kya aap lesson chhod rahe ho?',
    [
      { text: 'नहीं', style: 'cancel' },
      { text: 'हाँ, छोड़ें', style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}

export function LessonModal() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { lessonId } = route.params;

  const handleExit = useCallback(() => {
    confirmExit(() => navigation.goBack());
  }, [navigation]);

  // Intercept Android hardware back button with the same dialog
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmExit(() => navigation.goBack());
        return true; // swallow the default back action
      });
      return () => sub.remove();
    }, [navigation]),
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={handleExit}
          style={styles.closeButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="पाठ बंद करें"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>पाठ</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.lessonId}>Lesson ID: {lessonId}</Text>
        <Text style={styles.placeholder}>Lesson content — placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D8',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#555',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  lessonId: {
    fontSize: 13,
    color: '#888',
  },
  placeholder: {
    fontSize: 14,
    color: '#AAA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 8,
  },
});

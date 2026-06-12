import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function GharScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>🏠 घर</Text>
        <Text style={styles.placeholder}>Home feed — placeholder</Text>
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('LessonModal', { lessonId: 'demo-1' })}
        >
          <Text style={styles.buttonText}>पाठ खोलें (demo)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 16, color: '#1A1A2E' },
  placeholder: {
    fontSize: 14,
    color: '#AAA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export function SafarScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>🗺️ सफ़र</Text>
        <Text style={styles.placeholder}>Learning journey / map — placeholder</Text>
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
  },
});

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export function OtpScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>अंग्रेज़</Text>
        <Text style={styles.tagline}>अंग्रेज़ी सीखो, आगे बढ़ो।</Text>
        <Text style={styles.placeholder}>OTP login — placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
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

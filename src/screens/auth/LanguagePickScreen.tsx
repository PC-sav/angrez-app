import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch } from '../../store/hooks';
import { setLanguage } from '../../store/slices/userSlice';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'LanguagePick'>;

export function LanguagePickScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();

  const selectHindi = () => {
    dispatch(setLanguage('hi'));
    navigation.navigate('Phone');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>अंग्रेज़</Text>
        <Text style={styles.title}>{AUTH.languagePick.title}</Text>

        <Pressable style={styles.option} onPress={selectHindi}>
          <Text style={styles.optionText}>{AUTH.languagePick.hindi}</Text>
        </Pressable>

        <Pressable style={[styles.option, styles.optionDisabled]} disabled>
          <View style={styles.optionRow}>
            <Text style={[styles.optionText, styles.optionTextDisabled]}>
              {AUTH.languagePick.bengali}
            </Text>
            <Text style={styles.comingSoon}>{AUTH.languagePick.comingSoon}</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#4A90D9',
    alignItems: 'center',
  },
  optionDisabled: {
    borderColor: '#DDD',
    backgroundColor: '#F8F8F8',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  optionTextDisabled: {
    color: '#AAA',
  },
  comingSoon: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

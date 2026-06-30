import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme';

export type CheckoutParams = MainStackParamList['Checkout'];

type Props = NativeStackScreenProps<MainStackParamList, 'Checkout'>;

// Block 2 replaces this body with the WebView checkout surface.
export function CheckoutScreen(_props: Props) {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});

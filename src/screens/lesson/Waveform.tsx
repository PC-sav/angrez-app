import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 20;

interface Props {
  active: boolean;
  level: number;
}

export function Waveform({ active, level }: Props) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.05)),
  ).current;
  const levelRef = useRef(level);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const l = levelRef.current;
      bars.forEach((bar, i) => {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const target = active
          ? Math.max(0.05, l * (0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 200 + phase))))
          : 0.05;
        Animated.timing(bar, {
          toValue: target,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
      setTimeout(tick, 100);
    };
    tick();
    return () => { running = false; };
  }, [active, bars]);

  return (
    <View style={styles.container}>
      {bars.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: active ? '#FF6B35' : '#B0C4DE',
              height: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 80] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 80,
    paddingHorizontal: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});

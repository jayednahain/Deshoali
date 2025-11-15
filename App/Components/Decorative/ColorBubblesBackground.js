import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// A lightweight, dependency-free animated background with colorful floating bubbles
// Usage: place inside a relatively positioned container; it renders absolutely and ignores touches.
export default function ColorBubblesBackground({ style, density = 'medium' }) {
  const bubbles = useRef(
    Array.from({ length: density === 'high' ? 14 : density === 'low' ? 6 : 10 }).map(
      (_, i) => ({
        translateY: new Animated.Value(0),
        translateX: new Animated.Value(0),
        scale: new Animated.Value(0.9 + Math.random() * 0.4),
        opacity: new Animated.Value(0.2 + Math.random() * 0.15),
        seed: i,
      }),
    ),
  ).current;

  useEffect(() => {
    const animations = bubbles.map((b, idx) => {
      const duration = 8000 + Math.random() * 6000;
      const xShift = (Math.random() - 0.5) * 40; // wiggle left-right
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(b.translateY, {
              toValue: -30 - Math.random() * 40,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(b.translateX, {
              toValue: xShift,
              duration: duration * 0.7,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(b.opacity, {
              toValue: 0.35,
              duration: duration * 0.5,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(b.translateY, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(b.translateX, {
              toValue: -xShift,
              duration: duration * 0.7,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(b.opacity, {
              toValue: 0.2,
              duration: duration * 0.5,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    });
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [bubbles]);

  const palette = [
    '#FF6B6B', // Coral
    '#4DABF7', // Sky
    '#51CF66', // Mint
    '#845EF7', // Purple
    '#FFD43B', // Yellow
    '#22B8CF', // Teal
  ];

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      {bubbles.map((b, i) => {
        const size = 90 + ((i * 37) % 70); // 90..160
        const color = palette[i % palette.length];
        const top = ((i * 97) % 100) + '%';
        const left = ((i * 61) % 100) + '%';
        return (
          <Animated.View
            key={`bubble-${i}`}
            style={[
              styles.bubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: b.opacity,
                transform: [
                  { translateY: b.translateY },
                  { translateX: b.translateX },
                  { scale: b.scale },
                ],
                top,
                left,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  bubble: {
    position: 'absolute',
    // soft shadow/glow under bubbles for depth
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

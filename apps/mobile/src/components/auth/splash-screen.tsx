import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');

interface VQRSplashScreenProps {
  onFinish: () => void;
}

export default function VQRSplashScreen({ onFinish }: VQRSplashScreenProps) {
  const theme = useTheme();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const glowPulse = useRef(new Animated.Value(0.8)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo Scale & Fade in
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text slide up & Fade in
    Animated.delay(500).start(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });

    // 3. Continuous glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Fade out entire screen and call onFinish
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2800);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          opacity: screenFade,
        },
      ]}
    >
      {/* Background neon blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      <View style={styles.content}>
        {/* Glowing ring under logo */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: theme.primary,
              transform: [{ scale: glowPulse }],
              opacity: logoOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          ]}
        />

        {/* Logo Badge */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              backgroundColor: theme.primary,
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
              shadowColor: theme.primary,
            },
          ]}
        >
          <Text style={styles.logoIcon}>🚨</Text>
        </Animated.View>

        {/* Text Details */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.titleSub, { color: theme.primary }]}>VQR SYSTEM</Text>
          <Text style={[styles.titleMain, { color: theme.text }]}>EMERGENCY</Text>
          <Text style={[styles.titleMain, { color: theme.text }]}>RESPONSE</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Vehicle Safety & Extrication Guidance
          </Text>
        </Animated.View>
      </View>

      {/* Footer Branding */}
      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          STANDBY RESPONDER SYSTEM v1.0.0
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  neonBlobContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  neonBlob1: {
    position: 'absolute',
    top: '20%',
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  neonBlob2: {
    position: 'absolute',
    bottom: '20%',
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
  },
  titleSub: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  titleMain: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 42,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

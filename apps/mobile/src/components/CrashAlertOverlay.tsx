/**
 * CrashAlertOverlay
 * ==================
 * Full-screen emergency overlay shown when a crash is detected.
 * Features:
 * - Red pulsing background
 * - 30-second countdown to auto-send SOS
 * - "I'm OK" dismiss button
 * - "Send SOS NOW" confirm button
 * - Confidence score and detection details
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';

interface CrashAlertOverlayProps {
  visible: boolean;
  confidence: number;
  latitude?: number;
  longitude?: number;
  countdown: number;
  onDismiss: () => void;     // "I'm OK"
  onConfirmSOS: () => void;  // "Send SOS NOW"
}

const COUNTDOWN_SECONDS = 30;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CrashAlertOverlay({
  visible,
  confidence,
  latitude,
  longitude,
  countdown,
  onDismiss,
  onConfirmSOS,
}: CrashAlertOverlayProps) {
  console.log(`[CrashAlertOverlay] Render state: visible=${visible}, countdown=${countdown}, confidence=${confidence}`);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Reset countdown entry animation
  useEffect(() => {
    if (visible) {
      // Entry scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  // Pulse animation
  useEffect(() => {
    if (!visible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [visible]);

  // Shake animation for the warning icon
  useEffect(() => {
    if (!visible) return;

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    shake.start();

    return () => shake.stop();
  }, [visible]);

  if (!visible) return null;

  const confidencePercent = (confidence * 100).toFixed(0);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.container}>
        {/* Pulsing red background */}
        <Animated.View
          style={[
            styles.pulseBackground,
            { opacity: pulseAnim },
          ]}
        />

        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          {/* Warning icon with shake */}
          <Animated.Text
            style={[
              styles.warningIcon,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            🚨
          </Animated.Text>

          <Text style={styles.title}>CRASH DETECTED</Text>
          <Text style={styles.subtitle}>
            A vehicle crash has been detected with {confidencePercent}% confidence.
          </Text>

          {/* Countdown ring */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownLabel}>
              {countdown > 0
                ? 'seconds until auto-SOS'
                : 'Sending SOS...'}
            </Text>
          </View>

          {/* Location info */}
          {latitude != null && longitude != null && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>
                📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissButtonText}>✓ I'M OK</Text>
              <Text style={styles.dismissSubtext}>Cancel emergency alert</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sosButton}
              onPress={onConfirmSOS}
              activeOpacity={0.8}
            >
              <Text style={styles.sosButtonText}>🆘 SEND SOS NOW</Text>
              <Text style={styles.sosSubtext}>Alert emergency contacts</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Emergency contacts will receive your location via SMS.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99999,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pulseBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#dc2626',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  countdownContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 24,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  countdownLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    textAlign: 'center',
  },
  locationBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  dismissButton: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  dismissSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  sosButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 1,
  },
  sosSubtext: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 4,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },
});

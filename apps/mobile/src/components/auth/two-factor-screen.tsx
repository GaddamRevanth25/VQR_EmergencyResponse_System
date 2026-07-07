import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VQRTwoFactorScreenProps {
  onVerifySuccess: () => void;
  onGoBack: () => void;
}

export default function VQRTwoFactorScreen({
  onVerifySuccess,
  onGoBack,
}: VQRTwoFactorScreenProps) {
  const theme = useTheme();

  // 6-digit passcode state
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // References to code inputs
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Biometric overlay animation state
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const biometricScanLine = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer for code resend
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleTextChange = (text: string, index: number) => {
    // Keep only numbers
    const cleanText = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = cleanText;
    setCode(newCode);

    // If typing a digit, shift focus to the next box
    if (cleanText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // If pressing backspace, clear and move focus back
    if (e.nativeEvent.key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Validation Error', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    // Simulate 2FA Verification API Call
    setTimeout(() => {
      setLoading(false);
      onVerifySuccess(); // Redirects to Main Dashboard
    }, 1200);
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(30);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    Alert.alert('Code Dispatched', 'A fresh security code has been sent via SMS/Email.');
  };

  // Biometric verification inside 2FA
  const startBiometricVerification = () => {
    setBiometricStatus('scanning');
    setShowBiometricModal(true);

    biometricScanLine.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(biometricScanLine, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(biometricScanLine, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    setTimeout(() => {
      setBiometricStatus('success');
      setTimeout(() => {
        setShowBiometricModal(false);
        onVerifySuccess();
      }, 1000);
    }, 2200);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
      {/* Neon Blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      {/* Header bar with Back button on top left */}
      <View style={styles.backRow}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: theme.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={[styles.shieldBg, { backgroundColor: theme.primary }]}>
            <Text style={styles.shieldIcon}>🔒</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>2-Factor Verification</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter the 6-digit verification code sent to your registered device.
          </Text>
        </View>

        {/* Code Grid Input */}
        <View style={styles.passcodeContainer}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              value={digit}
              onChangeText={(text) => handleTextChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[
                styles.passcodeInputBox,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: digit ? theme.primary : theme.backgroundSelected,
                },
              ]}
            />
          ))}
        </View>

        {/* Resend details */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendInfo, { color: theme.textSecondary }]}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text
              style={[
                styles.resendText,
                { color: countdown > 0 ? theme.textSecondary : theme.primary },
              ]}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? 'Verifying...' : 'Verify Security Token'}
          </Text>
        </TouchableOpacity>

        {/* Biometric verification alternative */}
        <TouchableOpacity
          style={[styles.biometricBtn, { borderColor: theme.backgroundSelected }]}
          onPress={startBiometricVerification}
        >

          <Text style={[styles.biometricBtnText, { color: theme.text }]}>Passkey</Text>
        </TouchableOpacity>

        {/* Biometric Scanning Overlay Modal (iPhone Face ID Prompt Style) */}
        {showBiometricModal && (
          <View style={styles.faceIdOverlay}>
            <Animated.View
              style={[
                styles.faceIdHud,
                {
                  backgroundColor: 'rgba(28, 28, 30, 0.95)',
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              {biometricStatus === 'scanning' ? (
                <View style={styles.faceIdGraphic}>
                  {/* Custom CSS Face ID Face */}
                  <View style={styles.faceIdFace}>
                    <View style={[styles.faceIdEye, { left: 14 }]} />
                    <View style={[styles.faceIdEye, { right: 14 }]} />
                    <View style={styles.faceIdNose} />
                    <View style={styles.faceIdMouth} />
                  </View>
                  {/* Scanner corners */}
                  <View style={[styles.faceIdCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                  <View style={[styles.faceIdCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
                  <View style={[styles.faceIdCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                  <View style={[styles.faceIdCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                </View>
              ) : (
                <View style={styles.faceIdSuccessGraphic}>
                  <Text style={styles.faceIdCheckmark}>✓</Text>
                </View>
              )}

              <Text style={styles.faceIdHudText}>
                {biometricStatus === 'scanning' ? 'Face ID' : 'Verified'}
              </Text>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 60,
    minHeight: '100%',
    justifyContent: 'center',
  },
  neonBlobContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  neonBlob1: {
    position: 'absolute',
    top: 50,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  neonBlob2: {
    position: 'absolute',
    bottom: 50,
    right: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  backRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
    width: '100%',
    zIndex: 10,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 1,
  },
  shieldBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  passcodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
    zIndex: 1,
  },
  passcodeInputBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    zIndex: 1,
  },
  resendInfo: {
    fontSize: 13,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '800',
  },
  verifyBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    zIndex: 1,
  },
  biometricEmoji: {
    fontSize: 18,
  },
  biometricBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  faceIdOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  faceIdHud: {
    width: 160,
    height: 160,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  faceIdGraphic: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  faceIdFace: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#0a84ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  faceIdEye: {
    position: 'absolute',
    top: 12,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0a84ff',
  },
  faceIdNose: {
    position: 'absolute',
    top: 15,
    width: 8,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#0a84ff',
  },
  faceIdMouth: {
    position: 'absolute',
    bottom: 8,
    width: 20,
    height: 8,
    borderBottomWidth: 2.5,
    borderRadius: 10,
    borderColor: '#0a84ff',
  },
  faceIdCorner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#0a84ff',
  },
  faceIdSuccessGraphic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#30d158',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  faceIdCheckmark: {
    color: '#30d158',
    fontSize: 32,
    fontWeight: '700',
  },
  faceIdHudText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

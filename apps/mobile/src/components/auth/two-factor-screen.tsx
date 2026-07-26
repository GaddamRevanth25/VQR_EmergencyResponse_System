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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@vqr/shared';
import { DEFAULT_API_URL } from '@/constants/config';


// Pure JS SHA256 and HMAC-SHA256 implementation
function sha256(ascii: string): string {
  function rrotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const lengthProperty = 'length';
  let result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let i, j;
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const wordsLength = ((asciiLength + 64) >>> 9 << 4) + 15;
  for (i = 0; i < wordsLength; i++) words[i] = 0;
  for (i = 0; i < ascii[lengthProperty]; i++) {
    words[i >>> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiLength >>> 5] |= 0x80 << (24 - (asciiLength % 32));
  words[wordsLength] = asciiLength;

  for (i = 0; i < wordsLength; i += 16) {
    const w = [];
    for (j = 0; j < 16; j++) w[j] = words[i + j];
    for (j = 16; j < 64; j++) {
      const s0: number = rrotate(w[j - 15], 7) ^ rrotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1: number = rrotate(w[j - 2], 17) ^ rrotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (j = 0; j < 64; j++) {
      const S1 = rrotate(e, 6) ^ rrotate(e, 11) ^ rrotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rrotate(a, 2) ^ rrotate(a, 13) ^ rrotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    result += hash[i].toString(16).padStart(8, '0');
  }
  return result;
}

function hmacSHA256(key: string, message: string): string {
  let keyBytes = key;
  if (keyBytes.length > 64) {
    keyBytes = sha256(keyBytes);
  }
  if (keyBytes.length < 64) {
    keyBytes = keyBytes.padEnd(64, '\x00');
  }
  
  let ipad = '';
  let opad = '';
  for (let i = 0; i < 64; i++) {
    ipad += String.fromCharCode(keyBytes.charCodeAt(i) ^ 0x36);
    opad += String.fromCharCode(keyBytes.charCodeAt(i) ^ 0x5c);
  }
  
  const innerHash = sha256(ipad + message);
  let innerHashChars = '';
  for (let i = 0; i < innerHash.length; i += 2) {
    innerHashChars += String.fromCharCode(parseInt(innerHash.substring(i, i + 2), 16));
  }
  
  return sha256(opad + innerHashChars);
}

interface VQRTwoFactorScreenProps {
  email: string;
  tempToken: string;
  onVerifySuccess: (user: any) => void;
  onGoBack: () => void;
}

export default function VQRTwoFactorScreen({
  email,
  tempToken,
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

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      Alert.alert('Validation Error', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);
      
      const res = await apiClient.verify2fa({
        email,
        code: fullCode,
        tempToken
      });
      setLoading(false);
      onVerifySuccess({ ...res.user, token: res.accessToken });
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Verification Failed', err.message || 'Incorrect or expired 2FA code.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);
      
      await apiClient.resend2faCode({ email, tempToken });
      
      setCountdown(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Code Dispatched', 'A fresh security code has been sent via SMS/Email.');
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Failed to resend 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  // Biometric verification inside 2FA
  const startBiometricVerification = async () => {
    const secret = await AsyncStorage.getItem('vqr_biometric_secret');
    if (!secret) {
      Alert.alert(
        'Passkey Not Enrolled',
        'Biometric credentials are not enrolled on this device. Please log in first with email/password and enable biometrics in Profile Settings.'
      );
      return;
    }

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

    setTimeout(async () => {
      try {
        const timestamp = Date.now().toString();
        const signature = hmacSHA256(secret, timestamp);

        const savedUrl = await AsyncStorage.getItem('vqr_api_url');
        const apiUrl = savedUrl || DEFAULT_API_URL;
        const apiClient = createApiClient(apiUrl);

        const res = await apiClient.verify2fa({
          email: email.trim(),
          code: `${timestamp}:${signature}`,
          tempToken: tempToken,
        });

        setBiometricStatus('success');
        setTimeout(() => {
          setShowBiometricModal(false);
          setBiometricStatus('idle');
          onVerifySuccess({ ...res.user, token: res.accessToken });
        }, 1000);
      } catch (err: any) {
        setShowBiometricModal(false);
        setBiometricStatus('idle');
        Alert.alert('Verification Failed', err.message || 'Incorrect or unregistered biometric credentials.');
      }
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

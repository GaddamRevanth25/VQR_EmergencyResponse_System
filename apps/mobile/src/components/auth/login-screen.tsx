import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
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

interface VQRLoginScreenProps {
  onLoginSuccess: (requires2fa: boolean, tempToken?: string, email?: string, user?: any) => void;
  onGoToRegister: () => void;
  onGoToVerifyEmail: (email: string) => void;
  registrationSuccessMsg?: string;
  clearSuccessMsg?: () => void;
}

export default function VQRLoginScreen({
  onLoginSuccess,
  onGoToRegister,
  onGoToVerifyEmail,
  registrationSuccessMsg,
  clearSuccessMsg,
}: VQRLoginScreenProps) {
  const theme = useTheme();

  // Login Mode: 'credentials' | 'otp'
  const [loginMode, setLoginMode] = useState<'credentials' | 'otp'>('credentials');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Biometric simulation states
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const biometricScanLine = useRef(new Animated.Value(0)).current;

  // Pulse animation for scan badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Looping glow animation for fingerprint button
  const biometricGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(biometricGlowAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (registrationSuccessMsg) {
      const timer = setTimeout(() => {
        if (clearSuccessMsg) clearSuccessMsg();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccessMsg]);

  // Biometric animation trigger
  const startBiometricSimulation = async () => {
    const secret = await AsyncStorage.getItem('vqr_biometric_secret');
    if (!secret) {
      Alert.alert(
        'Passkey Not Enrolled',
        'Biometric login is not set up on this device. Please sign in with email/password first and enroll under Profile Settings.'
      );
      return;
    }
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your registered email address to load your passkey.');
      return;
    }

    setBiometricStatus('scanning');
    setShowBiometricModal(true);

    // Reset scan line
    biometricScanLine.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(biometricScanLine, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(biometricScanLine, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate identification progress + execute real API login
    setTimeout(async () => {
      try {
        const timestamp = Date.now().toString();
        const signature = hmacSHA256(secret, timestamp);

        const savedUrl = await AsyncStorage.getItem('vqr_api_url');
        const apiUrl = savedUrl || DEFAULT_API_URL;
        const apiClient = createApiClient(apiUrl);

        const res = await apiClient.login({
          loginType: "biometric" as const,
          email: email.trim(),
          biometricToken: `${timestamp}:${signature}`,
          deviceId: Platform.OS,
        });

        setBiometricStatus('success');
        setTimeout(() => {
          setShowBiometricModal(false);
          setBiometricStatus('idle');
          if (res.requires2fa) {
            onLoginSuccess(true, res.tempToken, email.trim() || res.user?.email, null);
          } else {
            onLoginSuccess(false, undefined, undefined, { ...res.user, token: res.accessToken });
          }
        }, 1000);
      } catch (err: any) {
        setShowBiometricModal(false);
        setBiometricStatus('idle');
        Alert.alert('Authentication Failed', err.message || 'Incorrect or unregistered biometric credentials.');
      }
    }, 2800);
  };

  const handleLogin = async () => {
    if (loginMode === 'credentials') {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Validation Error', 'Please enter your email and password.');
        return;
      }
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid email address.');
        return;
      }
    } else {
      if (!phone.trim()) {
        Alert.alert('Validation Error', 'Please enter your phone number.');
        return;
      }
      const cleanedPhone = phone.replace(/[^0-9]/g, '');
      if (cleanedPhone.length < 10) {
        Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
        return;
      }
      if (otpSent && (!otpCode.trim() || otpCode.length < 6)) {
        Alert.alert('Validation Error', 'Please enter the 6-digit OTP verification code.');
        return;
      }
      if (!otpSent) {
        handleSendOtp();
        return;
      }
    }

    setLoading(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);
      const payload = loginMode === 'credentials'
        ? { loginType: 'email_password' as const, email: email.trim(), password }
        : { loginType: 'phone_otp' as const, phone: phone.trim(), otp: otpCode };
      const res = await apiClient.login(payload);
      setLoading(false);
      
      if (res.requires2fa) {
        onLoginSuccess(true, res.tempToken, email.trim() || res.user?.email, null);
      } else {
        onLoginSuccess(false, undefined, undefined, { ...res.user, token: res.accessToken });
      }
    } catch (err: any) {
      setLoading(false);
      if (err.message && err.message.toLowerCase().includes("not been confirmed")) {
        const targetEmail = email.trim();
        Alert.alert(
          'Registration Pending',
          'Your account is registered but email verification is pending. Would you like to enter your verification code now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Verify Now', 
              onPress: () => {
                if (targetEmail) {
                  onGoToVerifyEmail(targetEmail);
                } else {
                  Alert.alert('Email Required', 'Please enter your registered email address in the email field first.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Login Failed', err.message || 'Incorrect credentials or unconfirmed account.');
      }
    }
  };

  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);
      
      await apiClient.requestOtp({ phone: phone.trim() });
      setLoading(false);
      setOtpSent(true);
      setOtpCountdown(30);
      Alert.alert('OTP Dispatched', 'A temporary 6-digit passcode has been sent to your mobile device.');
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Failed to send OTP', err.message || 'Please check your phone number.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
      {/* Neon Blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Success Banner (Above the Logo) */}
        {registrationSuccessMsg ? (
          <View style={[styles.successBanner, { backgroundColor: theme.success + '22', borderColor: theme.success, width: '100%', marginBottom: 20 }]}>
            <Text style={[styles.successBannerText, { color: theme.success }]}>✓ {registrationSuccessMsg}</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View style={[styles.logoBg, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoIcon}>🚨</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            VQR Emergency Response
          </Text>
        </View>

        {/* Auth Tab Switcher */}
        <View style={[styles.tabContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              loginMode === 'credentials' && [styles.activeTab, { backgroundColor: theme.backgroundSelected }],
            ]}
            onPress={() => {
              setLoginMode('credentials');
              setOtpSent(false);
              setOtpCode('');
            }}
          >
            <Text style={[styles.tabLabel, { color: theme.text }]}>
              <Text style={{ color: '#000' }}>✉ </Text>Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              loginMode === 'otp' && [styles.activeTab, { backgroundColor: theme.backgroundSelected }],
            ]}
            onPress={() => setLoginMode('otp')}
          >
            <Text style={[styles.tabLabel, { color: theme.text }]}>📞 Phone</Text>
          </TouchableOpacity>
        </View>

        {/* Main Login Form */}
        <View style={[styles.form, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          {loginMode === 'credentials' ? (
            <>
              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Ex:user@gmail.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                />
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                />
              </View>
            </>
          ) : (
            <>
              {/* Phone Number Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 88xxx xx921"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    editable={!otpSent}
                    style={[
                      styles.input,
                      styles.phoneInput,
                      { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background },
                      otpSent && { opacity: 0.6 },
                    ]}
                  />
                  {otpSent && (
                    <TouchableOpacity
                      style={[styles.resendBtn, { borderColor: theme.primary }]}
                      onPress={() => setOtpSent(false)}
                    >
                      <Text style={[styles.resendBtnText, { color: theme.primary }]}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* OTP Code Field */}
              {otpSent && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>OTP Code (Sent to Phone)</Text>
                    <TextInput
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="123456"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                    />
                  </View>
                  <View style={styles.resendOTPContainer}>
                    <Text style={[styles.resendOTPText, { color: theme.textSecondary }]}>
                      Didn't receive the OTP?{' '}
                    </Text>
                    <TouchableOpacity onPress={handleSendOtp} disabled={otpCountdown > 0 || loading}>
                      <Text
                        style={[
                          styles.resendOTPLink,
                          { color: otpCountdown > 0 ? theme.textSecondary : theme.primary, fontWeight: '700' },
                        ]}
                      >
                        {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Processing...' : loginMode === 'otp' && !otpSent ? 'Send OTP ' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Biometric quick access */}
        <View style={styles.biometricSection}>
          <Text style={[styles.biometricHeading, { color: theme.textSecondary }]}>
            — Or Quick Login —
          </Text>
          <View style={styles.biometricButtonWrapper}>
            {/* Glowing Pulse Ring */}
            <Animated.View
              style={[
                styles.biometricGlowRing,
                {
                  borderColor: theme.primary,
                  transform: [
                    {
                      scale: biometricGlowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.4],
                      }),
                    },
                  ],
                  opacity: biometricGlowAnim.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [0.4, 0.2, 0],
                  }),
                },
              ]}
            />
            <TouchableOpacity
            style={[styles.biometricLogoButton, { borderColor: theme.textSecondary + '44', backgroundColor: 'transparent' }]}
            onPress={startBiometricSimulation}
            activeOpacity={0.6}
          >
            {Platform.OS === 'ios' ? (
              <View style={styles.btnFaceId}>
                <View style={[styles.btnFaceIdFace, { borderColor: theme.text }]}>
                  <View style={[styles.btnFaceIdEye, { left: 9, backgroundColor: theme.text }]} />
                  <View style={[styles.btnFaceIdEye, { right: 9, backgroundColor: theme.text }]} />
                  <View style={[styles.btnFaceIdNose, { borderColor: theme.text }]} />
                  <View style={[styles.btnFaceIdMouth, { borderColor: theme.text }]} />
                </View>
              </View>
            ) : (
              <Text style={[styles.biometricLargeEmoji, { opacity: 0.8 }]}>🫆</Text>
            )}
          </TouchableOpacity>
        </View>
          <Text style={[styles.biometricLabel, { color: theme.textSecondary }]}>
            Biometric Authentication
          </Text>
        </View>

      </ScrollView>

      {/* Register redirect */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Not registered? </Text>
        <TouchableOpacity onPress={onGoToRegister}>
          <Text style={[styles.registerLink, { color: theme.primary }]}>Register</Text>
        </TouchableOpacity>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 80,
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 1,
  },
  logoBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  successBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  form: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    zIndex: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
  },
  resendBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  biometricSection: {
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
    zIndex: 1,
  },
  biometricHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  biometricLogoButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: 84,
    height: 84,
    marginTop: 8,
  },
  biometricGlowRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
  },
  biometricLargeEmoji: {
    fontSize: 36,
  },
  biometricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    paddingTop: 8,
    zIndex: 1,
  },
  footerText: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
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
  topToast: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  topToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  btnFaceId: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFaceIdFace: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  btnFaceIdEye: {
    position: 'absolute',
    top: 9,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
  },
  btnFaceIdNose: {
    position: 'absolute',
    top: 11,
    width: 6,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  btnFaceIdMouth: {
    position: 'absolute',
    bottom: 5,
    width: 14,
    height: 6,
    borderBottomWidth: 2,
    borderRadius: 7,
  },
  resendOTPContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  resendOTPText: {
    fontSize: 13,
  },
  resendOTPLink: {
    fontSize: 13,
  },
});

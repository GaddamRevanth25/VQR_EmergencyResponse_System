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
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@vqr/shared';
import { DEFAULT_API_URL } from '@/constants/config';


interface VQRVerifyEmailScreenProps {
  email: string;
  onVerifySuccess: () => void;
  onGoBack: () => void;
}

export default function VQRVerifyEmailScreen({
  email,
  onVerifySuccess,
  onGoBack,
}: VQRVerifyEmailScreenProps) {
  const theme = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleTextChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = cleanText;
    setCode(newCode);

    if (cleanText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
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

      await apiClient.confirmEmail({ email, code: fullCode });
      Alert.alert('Email Confirmed', 'Your email has been verified successfully. Please login.');
      onVerifySuccess();
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'The code entered is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };
  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);
      
      await apiClient.resendVerificationEmail({ email });
      setCountdown(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Code Resent', 'A new verification code has been dispatched to your email.');
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: theme.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: theme.primary }]}>
            <Text style={styles.icon}>✉</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Verify Email</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We have sent a 6-digit confirmation code to {email}.
          </Text>
        </View>

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

        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? 'Verifying...' : 'Confirm Verification Code'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: theme.textSecondary }]}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || loading}>
            <Text
              style={[
                styles.resendLink,
                { color: countdown > 0 ? theme.textSecondary : theme.primary, fontWeight: '700' },
              ]}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
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
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 26,
    color: '#fff',
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    zIndex: 1,
  },
  resendText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
  },
});

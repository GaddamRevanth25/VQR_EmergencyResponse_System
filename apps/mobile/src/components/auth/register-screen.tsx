import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@vqr/shared';

interface VQRRegisterScreenProps {
  onRegisterSuccess: (email: string) => void;
  onGoToLogin: () => void;
}

export default function VQRRegisterScreen({
  onRegisterSuccess,
  onGoToLogin,
}: VQRRegisterScreenProps) {
  const theme = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please fill out all required fields.');
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const registrationDetails = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: 'User',
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      emergencyContactRelation: emergencyContactRelation.trim(),
      bloodGroup: bloodGroup.trim(),
      password: password
    };

    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || 'http://localhost:8000';
      const apiClient = createApiClient(apiUrl);
      
      await apiClient.register(registrationDetails);
      setLoading(false);
      onRegisterSuccess(email.trim());
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Registration Failed', err.message || 'An error occurred during registration.');
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

        <View style={styles.header}>
          <View style={[styles.logoBg, { backgroundColor: theme.primary }]}>
            <Text style={styles.logoIcon}>🚨</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Register as a Standby VQR Responder
          </Text>
        </View>

        {/* Registration Form */}
        <View style={[styles.form, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Officer John Doe"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Email */}
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

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 88xxx xx921"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Blood Group */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Blood Group</Text>
            <TextInput
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="Ex: O+, A-, B+"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Emergency Contact Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Emergency Contact Name</Text>
            <TextInput
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Jane Doe"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Emergency Contact Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Emergency Contact Phone</Text>
            <TextInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Ex: +91 99xxx xx111"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Emergency Contact Relation */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Emergency Contact Relation</Text>
            <TextInput
              value={emergencyContactRelation}
              onChangeText={setEmergencyContactRelation}
              placeholder="Ex: Spouse, Parent, Sibling"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
            />
          </View>

          {/* Register Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Registering...' : 'Register Account'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Login redirect */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have a  profile? </Text>
        <TouchableOpacity onPress={onGoToLogin}>
          <Text style={[styles.loginLink, { color: theme.primary }]}>Sign In </Text>
        </TouchableOpacity>
      </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 28,
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
  form: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
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
  loginLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});

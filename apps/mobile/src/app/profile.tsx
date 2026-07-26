import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';
import { useThemeAndAuth, ThemePreference } from '../context/ThemeAndAuthContext';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@vqr/shared';
import { DEFAULT_API_URL } from '@/constants/config';


export default function ProfileScreen() {
  const theme = useTheme();
  const { userInfo, themePreference, setThemePreference, logout, loginSession } = useThemeAndAuth();

  const [isBiometricEnrolled, setIsBiometricEnrolled] = React.useState(false);

  React.useEffect(() => {
    const checkEnrollment = async () => {
      const secret = await AsyncStorage.getItem('vqr_biometric_secret');
      setIsBiometricEnrolled(!!secret);
    };
    checkEnrollment();
  }, []);

  const handleEnrollBiometrics = async () => {
    if (isBiometricEnrolled) {
      await AsyncStorage.removeItem('vqr_biometric_secret');
      setIsBiometricEnrolled(false);
      Alert.alert('Biometric login disabled', 'Passkey login has been removed from this device.');
      return;
    }

    if (!userInfo || !userInfo.email) {
      Alert.alert('Error', 'Please log in to enroll biometrics.');
      return;
    }

    try {
      const chars = '0123456789abcdef';
      let secret = '';
      for (let i = 0; i < 32; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
      }

      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);

      await apiClient.registerBiometric({
        email: userInfo.email,
        biometricPublicKey: secret,
      });

      await AsyncStorage.setItem('vqr_biometric_secret', secret);
      setIsBiometricEnrolled(true);
      Alert.alert('Success', 'Biometrics (Face/Finger ID) enrolled successfully on this device!');
    } catch (e: any) {
      Alert.alert('Enrollment Failed', e.message || 'An error occurred during enrollment.');
    }
  };

  const [is2FaEnabled, setIs2FaEnabled] = React.useState(false);

  React.useEffect(() => {
    if (userInfo) {
      setIs2FaEnabled(!!(userInfo as any).two_factor_enabled || !!(userInfo as any).twoFactorEnabled);
    }
  }, [userInfo]);

  const handleToggle2FA = async () => {
    if (!userInfo) {
      Alert.alert('Error', 'Please log in to configure 2FA.');
      return;
    }
    const token = (userInfo as any).token;
    if (!token) {
      Alert.alert('Error', 'Session token is missing. Please log out and sign in again.');
      return;
    }

    try {
      const nextVal = !is2FaEnabled;

      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);

      await apiClient.toggle2fa({ enabled: nextVal }, token);

      setIs2FaEnabled(nextVal);

      const updatedUser = { ...userInfo, two_factor_enabled: nextVal, twoFactorEnabled: nextVal };
      await AsyncStorage.setItem('@vqr_user_info', JSON.stringify(updatedUser));
      loginSession(updatedUser);

      Alert.alert('Success', `Two-Factor Authentication (2FA) has been ${nextVal ? 'enabled' : 'disabled'}.`);
    } catch (e: any) {
      Alert.alert('Toggle Failed', e.message || 'An error occurred while toggling 2FA.');
    }
  };

  const handleSimulateCrash = async () => {
    const { CrashDetectionService } = require('@/services/CrashDetectionService');
    const { router } = require('expo-router');

    const success = CrashDetectionService.simulateCrash(0.98);
    if (success) {
      // Auto-redirect immediately to emergency countdown screen without confirmation popup
      router.replace('/');
    } else {
      Alert.alert(
        "Simulation Ignored",
        "Crash detection service is currently inactive. Please toggle 'Crash Detection' to ON in the Home screen settings before simulating a crash."
      );
    }
  };

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePreference(pref);
  };

  // Edit mode toggles
  const [isEditingPersonal, setIsEditingPersonal] = React.useState(false);
  const [isEditingEmergency, setIsEditingEmergency] = React.useState(false);
  const [savingPersonal, setSavingPersonal] = React.useState(false);
  const [savingEmergency, setSavingEmergency] = React.useState(false);
  const [verifyingEmail, setVerifyingEmail] = React.useState(false);
  const [verifyingPhone, setVerifyingPhone] = React.useState(false);

  // Editable Form fields initialized from userInfo
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [bloodGroup, setBloodGroup] = React.useState('');

  const [emergencyName, setEmergencyName] = React.useState('');
  const [emergencyPhone, setEmergencyPhone] = React.useState('');
  const [emergencyRelation, setEmergencyRelation] = React.useState('');

  // Sync with userInfo
  React.useEffect(() => {
    if (userInfo) {
      setName(userInfo.name || '');
      setEmail(userInfo.email || '');
      setPhone(userInfo.phone || '');
      setBloodGroup((userInfo as any).bloodGroup || (userInfo as any).blood_group || '');
      setEmergencyName((userInfo as any).emergencyContactName || (userInfo as any).emergency_contact_name || '');
      setEmergencyPhone((userInfo as any).emergencyContactPhone || (userInfo as any).emergency_contact_phone || '');
      setEmergencyRelation((userInfo as any).emergencyContactRelation || (userInfo as any).emergency_contact_relation || '');
    }
  }, [userInfo]);

  const token = (userInfo as any)?.token || '';

  const handleSavePersonal = async () => {
    if (!token) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    setSavingPersonal(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);

      const updated = await apiClient.updateProfile({
        name,
        email,
        phone,
        blood_group: bloodGroup,
        bloodGroup: bloodGroup,
      } as any, token);

      const merged = { ...userInfo, ...updated, token };
      await AsyncStorage.setItem('@vqr_user_info', JSON.stringify(merged));
      loginSession(merged);
      setIsEditingPersonal(false);
      Alert.alert('Success', 'Personal credentials updated successfully!');
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update personal profile.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveEmergency = async () => {
    if (!token) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    setSavingEmergency(true);
    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);

      const updated = await apiClient.updateProfile({
        emergency_contact_name: emergencyName,
        emergencyContactName: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergencyContactPhone: emergencyPhone,
        emergency_contact_relation: emergencyRelation,
        emergencyContactRelation: emergencyRelation,
      } as any, token);

      const merged = { ...userInfo, ...updated, token };
      await AsyncStorage.setItem('@vqr_user_info', JSON.stringify(merged));
      loginSession(merged);
      setIsEditingEmergency(false);
      Alert.alert('Success', 'Emergency contact details updated successfully!');
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update emergency contacts.');
    } finally {
      setSavingEmergency(false);
    }
  };

  const handleVerifyCredential = async (type: 'email' | 'phone') => {
    if (!token) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    if (type === 'email') setVerifyingEmail(true);
    else setVerifyingPhone(true);

    try {
      const savedUrl = await AsyncStorage.getItem('vqr_api_url');
      const apiUrl = savedUrl || DEFAULT_API_URL;
      const apiClient = createApiClient(apiUrl);

      const updated = await apiClient.verifyCredentials(type, token);

      const merged = { ...userInfo, ...updated, token };
      await AsyncStorage.setItem('@vqr_user_info', JSON.stringify(merged));
      loginSession(merged);
      Alert.alert('Verified', `${type === 'email' ? 'Email' : 'Mobile number'} has been verified in the users table!`);
    } catch (e: any) {
      Alert.alert('Verification Failed', e.message || 'Could not verify credential.');
    } finally {
      if (type === 'email') setVerifyingEmail(false);
      else setVerifyingPhone(false);
    }
  };

  const user = userInfo || {
    name: 'Officer Davis',
    email: 'davis@vqr-response.gov',
    phone: '+91 88xxx xx921',
    role: 'Primary First Responder',
  };

  const isEmailVerified = !!(user as any).email_verified || !!(user as any).emailVerified || !!(user as any).is_verified || !!(user as any).isVerified;
  const isPhoneVerified = !!(user as any).phone_verified || !!(user as any).phoneVerified;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background neon blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" alwaysBounceVertical={true} showsVerticalScrollIndicator={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Manage account settings and preferences</Text>
        </View>

        {/* Personal Credentials Header with Edit */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Personal Credentials</Text>
          <TouchableOpacity 
            onPress={() => setIsEditingPersonal(!isEditingPersonal)}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.primary + '18' }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>
              {isEditingPersonal ? '✕ Cancel' : '✎ Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* User Card / Editable Form */}
        {!isEditingPersonal ? (
          <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '22' }]}>
                <Text style={styles.avatarText}>👮</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                <Text style={[styles.userMeta, { color: theme.destructive, fontWeight: 'bold', marginTop: 2 }]}>🩸 Blood Group: {(user as any).bloodGroup || (user as any).blood_group || 'Not Specified'}</Text>
              </View>
            </View>

            {/* Email with Verification Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.backgroundSelected }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>EMAIL ADDRESS</Text>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 2 }}>{user.email}</Text>
              </View>
              {isEmailVerified ? (
                <View style={{ backgroundColor: '#10B98118', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#10B98130' }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: 'bold' }}>✓ Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={verifyingEmail}
                  onPress={() => handleVerifyCredential('email')}
                  style={{ backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                    {verifyingEmail ? 'Verifying...' : 'Verify Email'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Phone with Verification Badge */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.backgroundSelected }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>MOBILE NUMBER</Text>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 2 }}>{user.phone}</Text>
              </View>
              {isPhoneVerified ? (
                <View style={{ backgroundColor: '#10B98118', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: 'bold' }}>✓ Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={verifyingPhone}
                  onPress={() => handleVerifyCredential('phone')}
                  style={{ backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                    {verifyingPhone ? 'Verifying...' : 'Verify Mobile'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.primary, marginBottom: 24 }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderWidth: 1, borderColor: theme.backgroundSelected }}
            />

            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderWidth: 1, borderColor: theme.backgroundSelected }}
            />

            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>MOBILE NUMBER</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              placeholderTextColor={theme.textSecondary}
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderWidth: 1, borderColor: theme.backgroundSelected }}
            />

            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>BLOOD GROUP</Text>
            <TextInput
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. O+, A+, B-"
              placeholderTextColor={theme.textSecondary}
              style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 16, borderWidth: 1, borderColor: theme.backgroundSelected }}
            />

            <TouchableOpacity
              disabled={savingPersonal}
              onPress={handleSavePersonal}
              style={{ backgroundColor: theme.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
            >
              {savingPersonal ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Save Personal Credentials</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Info Card / Editable Form */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Emergency Contact Details</Text>
            <TouchableOpacity 
              onPress={() => setIsEditingEmergency(!isEditingEmergency)}
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.primary + '18' }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>
                {isEditingEmergency ? '✕ Cancel' : '✎ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isEditingEmergency ? (
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Contact Name</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {(user as any).emergencyContactName || (user as any).emergency_contact_name || 'None'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Relationship</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {(user as any).emergencyContactRelation || (user as any).emergency_contact_relation || 'Not Specified'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Contact Phone</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {(user as any).emergencyContactPhone || (user as any).emergency_contact_phone || 'N/A'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.primary }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>CONTACT NAME</Text>
              <TextInput
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Emergency Contact Name"
                placeholderTextColor={theme.textSecondary}
                style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderWidth: 1, borderColor: theme.backgroundSelected }}
              />

              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>RELATIONSHIP</Text>
              <TextInput
                value={emergencyRelation}
                onChangeText={setEmergencyRelation}
                placeholder="e.g. Father, Spouse, Sibling"
                placeholderTextColor={theme.textSecondary}
                style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 12, borderWidth: 1, borderColor: theme.backgroundSelected }}
              />

              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>CONTACT PHONE</Text>
              <TextInput
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="Emergency Phone Number"
                keyboardType="phone-pad"
                placeholderTextColor={theme.textSecondary}
                style={{ backgroundColor: theme.background, color: theme.text, borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 'bold', marginBottom: 16, borderWidth: 1, borderColor: theme.backgroundSelected }}
              />

              <TouchableOpacity
                disabled={savingEmergency}
                onPress={handleSaveEmergency}
                style={{ backgroundColor: theme.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                {savingEmergency ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Save Emergency Contacts</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Theme Settings Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme Mode Preferences</Text>
          <View style={[styles.themeSelector, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {(['light', 'dark'] as ThemePreference[]).map((pref) => {
              const active = themePreference === pref;
              const emoji = pref === 'light' ? '☀️' : '☾';
              return (
                <TouchableOpacity
                  key={pref}
                  style={[
                    styles.themeOption,
                    active && [styles.themeOptionActive, { backgroundColor: theme.backgroundSelected }],
                  ]}
                  onPress={() => handleThemeChange(pref)}
                >
                  <Text style={[styles.themeOptionText, { color: active ? theme.text : theme.textSecondary }]}>
                    {emoji} {pref.charAt(0).toUpperCase() + pref.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Biometrics & Security Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Security & Passkeys</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {/* 2FA Toggle Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>
                  Two-Factor Authentication (2FA)
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                  Require SMS/Email OTP code or biometric token on login
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: is2FaEnabled ? theme.destructive + '15' : theme.primary + '15',
                }}
                onPress={handleToggle2FA}
              >
                <Text style={{ color: is2FaEnabled ? theme.destructive : theme.primary, fontSize: 12, fontWeight: 'bold' }}>
                  {is2FaEnabled ? 'Disable' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Biometric Toggle Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>
                  Biometric Authentication
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                  Use Face ID or Touch ID for passwordless logins
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: isBiometricEnrolled ? theme.destructive + '15' : theme.primary + '15',
                }}
                onPress={handleEnrollBiometrics}
              >
                <Text style={{ color: isBiometricEnrolled ? theme.destructive : theme.primary, fontSize: 12, fontWeight: 'bold' }}>
                  {isBiometricEnrolled ? 'Disable' : 'Enroll'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Device Settings/Diagnostics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Device Diagnostics</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Device Platform</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{Platform.OS.toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>System Status</Text>
              <Text style={[styles.infoValue, { color: theme.success }]}>● Fully Operational</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Data Sync</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>Active Offline DB</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Cloud Connection</Text>
              <Text style={[styles.infoValue, { color: theme.primary }]}>Connected</Text>
            </View>
          </View>
        </View>

        {/* Developer Settings (Method 2 Simulation) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Developer & Testing Tools</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>
                Simulate Vehicle Crash
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2, marginBottom: 12 }}>
                Injects high G-force mock sensor data to test the crash dialog and emergency notification flow.
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleSimulateCrash}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  ⚡ Trigger Simulated Crash
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Options */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: theme.destructive }]}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoutBtnText, { color: theme.destructive }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  neonBlobContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  neonBlob1: {
    position: 'absolute',
    top: 50,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  neonBlob2: {
    position: 'absolute',
    bottom: 50,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 120,
    zIndex: 1,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  avatarText: {
    fontSize: 32,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  userMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  themeOptionActive: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.05)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionContainer: {
    marginTop: 10,
  },
  logoutBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

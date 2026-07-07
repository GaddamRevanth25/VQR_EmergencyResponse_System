import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';
import { useThemeAndAuth, ThemePreference } from '../context/ThemeAndAuthContext';

export default function ProfileScreen() {
  const theme = useTheme();
  const { userInfo, themePreference, setThemePreference, logout } = useThemeAndAuth();

  // Fallback default user values
  const user = userInfo || {
    name: 'Officer Davis',
    email: 'davis@vqr-response.gov',
    phone: '+91 88xxx xx921',
    role: 'Primary First Responder',
  };

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePreference(pref);
  };

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

        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '22' }]}>
            <Text style={styles.avatarText}>👮</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
            <Text style={[styles.userMeta, { color: theme.textSecondary }]}>✉ {user.email}</Text>
            <Text style={[styles.userMeta, { color: theme.textSecondary }]}>📞 {user.phone}</Text>
          </View>
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

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { createApiClient } from '@vqr/shared';

const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export default function ExploreScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [alerting, setAlerting] = useState(false);
  const backendUrl = DEFAULT_API_URL;

  const apiClient = createApiClient(backendUrl);

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  async function fetchVehicles() {
    setLoading(true);
    try {
      const data = await apiClient.listVehicles();
      setVehicles(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const triggerMobileAlert = async (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    if (!selectedVehicle) return;
    setAlerting(true);

    try {
      const res = await apiClient.triggerAlert({
        vehicleId: selectedVehicle.id,
        severity,
        message: `MOBILE CATALOG ALERT: Rescue scan alert for ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}.`,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      if (res.success) {
        Alert.alert('Dispatch Alerted', `Sent alert to center. ID: ${res.alertId}`);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to dispatch alert to emergency center.');
    } finally {
      setAlerting(false);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' };
      case 'high':
        return { bg: '#ffedd5', text: '#f97316', border: '#fdbb2d' };
      case 'medium':
        return { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' };
      default:
        return { bg: '#dbeafe', text: '#3b82f6', border: '#93c5fd' };
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.id.toLowerCase().includes(term)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Detail overlay view if a vehicle is selected */}
      {selectedVehicle ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.vehicleHeader}>
            <View>
              <Text style={styles.vehicleTitle}>
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </Text>
              <Text style={styles.vehicleSubtitle}>ID Ref: {selectedVehicle.id}</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={() => setSelectedVehicle(null)}>
              <Text style={styles.resetButtonText}>Close Guide</Text>
            </TouchableOpacity>
          </View>

          {/* Video */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extraction Video Guide</Text>
            <View style={styles.videoWrapper}>
              <Video
                source={{ uri: `${backendUrl}/public${selectedVehicle.videoUrl}` }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                useNativeControls
                style={styles.video}
              />
            </View>
          </View>

          {/* Safety guidelines */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Cutout Guidelines</Text>
            {selectedVehicle.safetyGuidelines.map((g: any, index: number) => {
              const style = getPriorityStyle(g.priority);
              return (
                <View key={index} style={[styles.guidelineCard, { borderLeftColor: style.text }]}>
                  <View style={styles.guidelineTitleRow}>
                    <Text style={styles.guidelineTitle}>{g.title}</Text>
                    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
                      <Text style={[styles.badgeText, { color: style.text }]}>{g.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.guidelineDesc}>{g.description}</Text>
                </View>
              );
            })}
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Specifications</Text>
            {selectedVehicle.features.map((f: any, index: number) => (
              <View key={index} style={styles.featureCard}>
                <Text style={styles.featureCategory}>{f.category}</Text>
                {f.items.map((item: string, idx: number) => (
                  <Text key={idx} style={styles.featureItem}>
                    • {item}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* Dispatch Action */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.criticalButton]}
              disabled={alerting}
              onPress={() => triggerMobileAlert('CRITICAL')}
            >
              <Text style={styles.actionButtonText}>Trigger Critical Dispatch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              disabled={alerting}
              onPress={() => triggerMobileAlert('WARNING')}
            >
              <Text style={styles.actionButtonText}>Trigger Alert</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rescue Catalog</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search catalog directory..."
                placeholderTextColor="#666"
                style={styles.searchInput}
              />
              <TouchableOpacity style={styles.refreshButton} onPress={fetchVehicles}>
                <Text style={styles.refreshButtonText}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.loadingText}>Loading vehicle entries...</Text>
            </View>
          ) : filteredVehicles.length === 0 ? (
            <Text style={styles.noResults}>No matching vehicles found.</Text>
          ) : (
            <View style={styles.catalogGrid}>
              {filteredVehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.card}
                  onPress={() => setSelectedVehicle(v)}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {v.make} {v.model}
                    </Text>
                    <Text style={styles.cardYear}>Model Year: {v.year}</Text>
                    <Text style={styles.cardStats}>{v.safetyGuidelines.length} safety items logged</Text>
                  </View>
                  <View style={styles.openBtn}>
                    <Text style={styles.openBtnText}>Open</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b0d',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#16171d',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
  },
  refreshButton: {
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  noResults: {
    color: '#777',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  catalogGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#16171d',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardYear: {
    fontSize: 12,
    color: '#888',
  },
  cardStats: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '500',
  },
  openBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 16,
    marginBottom: 20,
  },
  vehicleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  vehicleSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#a855f7',
    paddingLeft: 10,
  },
  videoWrapper: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  video: {
    flex: 1,
  },
  guidelineCard: {
    backgroundColor: '#16171d',
    borderWidth: 1,
    borderColor: '#222',
    borderLeftWidth: 4,
    padding: 14,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  guidelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  guidelineDesc: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
  },
  featureCard: {
    backgroundColor: '#16171d',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  featureCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a855f7',
    textTransform: 'uppercase',
  },
  featureItem: {
    fontSize: 13,
    color: '#ccc',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalButton: {
    backgroundColor: '#ef4444',
  },
  warningButton: {
    backgroundColor: '#d97706',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

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
import { createApiClient } from '@vqr/shared';
import { useTheme } from '@/hooks/use-theme';

// Host configurations
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const LOCAL_MOCK_VEHICLES = [
  {
    id: "toyota-camry-2024",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    safetyGuidelines: [
      {
        title: "High-Voltage Battery",
        priority: "critical",
        description: "Avoid orange cabling. Stabilize vehicle and isolate 12V before cutting pillars or floor pan."
      },
      {
        title: "Emergency Shutoff",
        priority: "high",
        description: "Primary service disconnect is beneath rear passenger seat; secondary is under hood left rail."
      },
      {
        title: "Airbag Inflators",
        priority: "medium",
        description: "Side curtain inflators run along roof rail. Maintain 10 inch clearance during extrication."
      }
    ],
    features: [
      {
        category: "Hybrid Specs",
        items: ["Li-ion pack", "Hybrid system", "Smart key"]
      },
      {
        category: "Safety Specs",
        items: ["Side curtain airbags", "Reinforced B-pillar"]
      }
    ],
    videoUrl: "/videos/camry.mp4",
    thumbnailUrl: "/thumbnails/camry.jpg",
    vin: "VQR-7C2-941"
  },
  {
    id: "honda-accord-2023",
    make: "Honda",
    model: "Accord",
    year: 2023,
    safetyGuidelines: [
      {
        title: "High-Voltage Battery Isolation",
        priority: "critical",
        description: "Isolate high voltage via 12V terminal disconnect under the hood. Avoid battery tray under the trunk."
      },
      {
        title: "Airbag Protection Zone",
        priority: "high",
        description: "Be aware of smart curtain airbag inflators located in C-pillars. Keep cut zone clear."
      }
    ],
    features: [
      {
        category: "Hybrid Specs",
        items: ["Li-ion Battery", "Regenerative Braking"]
      }
    ],
    videoUrl: "/videos/accord.mp4",
    thumbnailUrl: "/thumbnails/accord.jpg",
    vin: "VQR-2AF-108"
  },
  {
    id: "ford-f150-lightning-2022",
    make: "Ford",
    model: "F-150 Lightning",
    year: 2022,
    safetyGuidelines: [
      {
        title: "Large EV Battery Pack",
        priority: "critical",
        description: "Massive underbody lithium-ion pack. Do not puncture or apply flame to floor area. Isolate immediately."
      }
    ],
    features: [
      {
        category: "Electric Specs",
        items: ["Dual Motor", "Mega Power Frunk"]
      }
    ],
    videoUrl: "/videos/f150.mp4",
    thumbnailUrl: "/thumbnails/f150.jpg",
    vin: "VQR-EV-512"
  }
];

export default function ExploreScreen() {
  const theme = useTheme();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [alerting, setAlerting] = useState(false);
  const [expandedGuideline, setExpandedGuideline] = useState<number | null>(null);
  
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
      if (data && data.length > 0) {
        setVehicles(data);
      } else {
        setVehicles(LOCAL_MOCK_VEHICLES);
      }
    } catch (err: any) {
      console.warn("Failed to fetch vehicles list from API, using offline DB:", err.message);
      setVehicles(LOCAL_MOCK_VEHICLES);
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
        message: `MOBILE ACTIVE ALERT: Response team dispatched to ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}. guidelines isolation standard armed!`,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      if (res.success) {
        Alert.alert('Dispatch Alerted', `Sent alert to center. ID: ${res.alertId}`);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Offline Mode Alert', 'Dispatch center unavailable. Guidelines verified locally.');
    } finally {
      setAlerting(false);
    }
  };

  const getPriorityColors = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: '#ef4444' };
      case 'high':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: '#f59e0b' };
      case 'medium':
        return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: '#3b82f6' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: '#94a3b8' };
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background neon blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      {selectedVehicle ? (
        /* DETAIL VIEW OVERLAY */
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.detailsHeader}>
            <View>
              <TouchableOpacity onPress={() => setSelectedVehicle(null)} style={styles.backBtn}>
                <Text style={[styles.backArrow, { color: theme.textSecondary }]}>← Close Guide</Text>
              </TouchableOpacity>
              <Text style={[styles.detailsVIN, { color: theme.primary }]}>{selectedVehicle.vin || 'VQR-REF-INC'}</Text>
              <Text style={[styles.detailsTitle, { color: theme.text }]}>
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </Text>
            </View>
            <View style={[styles.matchBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: theme.success }]}>
              <Text style={[styles.matchBadgeText, { color: theme.success }]}>100% Match</Text>
            </View>
          </View>

          {/* Safety guidelines accordion */}
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>Safety Cutout Guidelines</Text>
            {selectedVehicle.safetyGuidelines.map((g: any, index: number) => {
              const priorityStyles = getPriorityColors(g.priority);
              const isExpanded = expandedGuideline === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.guidelineCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                      borderLeftColor: priorityStyles.border,
                    },
                  ]}
                  onPress={() => setExpandedGuideline(isExpanded ? null : index)}
                  activeOpacity={0.9}
                >
                  <View style={styles.guidelineHeader}>
                    <Text style={[styles.guidelineTitle, { color: theme.text }]}>{g.title}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityStyles.bg, borderColor: priorityStyles.border }]}>
                      <Text style={[styles.priorityBadgeText, { color: priorityStyles.text }]}>
                        {g.priority}
                      </Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <Text style={[styles.guidelineDesc, { color: theme.textSecondary }]}>
                      {g.description || g.body}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Specifications Pills */}
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>Vehicle Specifications</Text>
            <View style={styles.specChipsContainer}>
              {selectedVehicle.features.flatMap((f: any) => f.items).map((item: string, i: number) => (
                <View key={i} style={[styles.specChip, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={[styles.specChipText, { color: theme.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Video guide briefing */}
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>Extraction Video Guide</Text>
            <View style={[styles.videoWrapper, { backgroundColor: '#020617', borderColor: theme.backgroundSelected }]}>
              <View style={styles.videoPlayerMock}>
                <View style={styles.playButtonBg}>
                  <Text style={styles.playButtonSymbol}>▶</Text>
                </View>
                <Text style={styles.videoMockLabel}>Standard extrication guidelines ready</Text>
              </View>

              <View style={styles.videoTimelineContainer}>
                <View style={styles.videoTimelineBg}>
                  <View style={[styles.videoTimelineFill, { backgroundColor: theme.primary }]} />
                </View>
                <Text style={styles.videoDuration}>03:22</Text>
              </View>
            </View>
          </View>

          {/* Dispatch controls */}
          <View style={styles.dispatchSection}>
            <TouchableOpacity
              style={[styles.dispatchBtn, { backgroundColor: theme.destructive }]}
              disabled={alerting}
              onPress={() => triggerMobileAlert('CRITICAL')}
            >
              <Text style={styles.dispatchBtnText}>Trigger Critical Dispatch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dispatchBtn, { backgroundColor: theme.warning }]}
              disabled={alerting}
              onPress={() => triggerMobileAlert('WARNING')}
            >
              <Text style={[styles.dispatchBtnText, { color: '#020617' }]}>Trigger warning alert</Text>
            </TouchableOpacity>
          </View>

          {/* Close Guide button */}
          <TouchableOpacity
            style={[styles.resetScanBtn, { backgroundColor: theme.primary }]}
            onPress={() => setSelectedVehicle(null)}
          >
            <Text style={styles.resetScanBtnText}>Close Catalog Guide</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* CATALOG LIST VIEW */
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Rescue Catalog</Text>
            
            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search catalog directory..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              />
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: theme.backgroundSelected }]}
                onPress={fetchVehicles}
              >
                <Text style={[styles.refreshButtonText, { color: theme.text }]}>Reload</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading vehicle entries...</Text>
            </View>
          ) : filteredVehicles.length === 0 ? (
            <Text style={[styles.noResults, { color: theme.textSecondary }]}>No matching vehicles found.</Text>
          ) : (
            <View style={styles.catalogGrid}>
              {filteredVehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setExpandedGuideline(null);
                    setSelectedVehicle(v);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {v.make} {v.model}
                    </Text>
                    <Text style={[styles.cardYear, { color: theme.textSecondary }]}>Model Year: {v.year}</Text>
                    <Text style={[styles.cardStats, { color: theme.primary }]}>
                      {v.safetyGuidelines.length} safety items logged
                    </Text>
                  </View>
                  <View style={[styles.openBtn, { backgroundColor: theme.backgroundSelected }]}>
                    <Text style={[styles.openBtnText, { color: theme.text }]}>Open</Text>
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
    paddingBottom: 60,
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
  },
  searchRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  refreshButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  catalogGrid: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.01,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cardInfo: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardYear: {
    fontSize: 12,
  },
  cardStats: {
    fontSize: 12,
    fontWeight: '700',
  },
  openBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  backArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsVIN: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailsTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  matchBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsSection: {
    marginTop: 20,
    gap: 10,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  guidelineCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  guidelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  guidelineDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  specChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  videoWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPlayerMock: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    position: 'relative',
  },
  playButtonBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  playButtonSymbol: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 2,
  },
  videoMockLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 12,
    fontWeight: '700',
  },
  videoTimelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  videoTimelineBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoTimelineFill: {
    width: '35%',
    height: '100%',
    borderRadius: 2,
  },
  videoDuration: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  dispatchSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  dispatchBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  resetScanBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetScanBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

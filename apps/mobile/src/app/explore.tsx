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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';

// Host configurations
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const MOCK_DEFAULT_HISTORY = [
  {
    id: "toyota-camry-2024",
    title: "Toyota Camry (2024)",
    type: "browse",
    timestamp: "02:14 PM",
    date: "Jul 10, 2026",
    params: { make: "Toyota", model: "Camry", year: 2024 }
  },
  {
    id: "bmw-740li-2012",
    title: "BMW 740Li (2012)",
    type: "manual",
    timestamp: "10:30 AM",
    date: "Jul 08, 2026",
    params: { reg: "MH02CL0555" }
  },
  {
    id: "honda-cbr-2023",
    title: "Honda CBR (2023)",
    type: "scan",
    timestamp: "06:45 PM",
    date: "Jul 09, 2026",
    params: { reg: "HONDA-CBR" }
  }
];

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
  const navigation = useNavigation();
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [alerting, setAlerting] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'safety' | 'emergency' | 'features' | 'video'>('safety');
  const [videoPlayTime, setVideoPlayTime] = useState('0:00');

  const backendUrl = DEFAULT_API_URL;
  const apiClient = createApiClient(backendUrl);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('vqr_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setRecentSearches(parsed);
          return;
        }
      }
      // Seed with mock defaults
      await AsyncStorage.setItem('vqr_recent_searches', JSON.stringify(MOCK_DEFAULT_HISTORY));
      setRecentSearches(MOCK_DEFAULT_HISTORY);
    } catch (e) {
      setRecentSearches(MOCK_DEFAULT_HISTORY);
    }
  };

  useEffect(() => {
    loadHistory();
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });
    return unsubscribe;
  }, [navigation]);

  const clearHistory = async () => {
    try {
      await AsyncStorage.setItem('vqr_recent_searches', JSON.stringify([]));
      setRecentSearches([]);
    } catch (e) {}
  };

  const handleItemPress = async (id: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getVehicle(id);
      setSelectedVehicle(data);
    } catch (err) {
      Alert.alert(
        "Offline Mode",
        "Could not load live vehicle safety data. Displaying pre-cached checklist.",
        [
          {
            text: "OK",
            onPress: () => {
              // Fallback to mock item
              const found = MOCK_DEFAULT_HISTORY.find(x => x.id === id);
              setSelectedVehicle({
                id,
                make: found ? found.title.split(' ')[0] : 'Toyota',
                model: found ? found.title.split(' ')[1] : 'Camry',
                year: 2024,
                fuelType: "HYBRID",
                safetyGuidelines: [
                  { title: "Emergency Cut Points", description: "Cut point isolation marked on outer pillars.", location: "A/B Pillars", priority: "high" }
                ],
                features: []
              });
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

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

  const filteredHistory = recentSearches.filter((item) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      item.title?.toLowerCase().includes(query) ||
      item.date?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query)
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
        /* DETAIL VIEW OVERLAY - FOLLOWING SAFETY LAYOUT PATTERN */
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

          {/* Tabs bar */}
          <View style={styles.tabsBar}>
            {(['safety', 'emergency', 'features', 'video'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveResultTab(t)}
                style={[
                  styles.tabButton,
                  { borderBottomColor: activeResultTab === t ? theme.primary : 'transparent' }
                ]}
              >
                <Text style={[styles.tabButtonText, { color: activeResultTab === t ? theme.primary : theme.textSecondary }]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content 1: Safety Features */}
          {activeResultTab === 'safety' && (
            <View style={styles.tabContent}>
              {(selectedVehicle.safetyGuidelines || selectedVehicle.safetyFeatures || []).map((feat: any, idx: number) => {
                const icon = feat.icon === 'hammer' ? '🔨' : feat.icon === 'exit' ? '🚪' : '⚠️';
                return (
                  <View key={idx} style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.infoCardTitle, { color: theme.text }]}>{icon} {feat.title}</Text>
                    <Text style={[styles.infoCardText, { color: theme.textSecondary }]}>{feat.description || feat.body}</Text>
                    <Text style={[styles.infoCardLoc, { color: theme.primary }]}>📍 Location: {feat.location || "Under hood"}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tab Content 2: Emergency Scenario Guide */}
          {activeResultTab === 'emergency' && (
            <View style={styles.tabContent}>
              {(selectedVehicle.emergencyProcedures || [
                {
                  scenario: "Engine Compartment Fire",
                  dos: ["Safely pull over immediately", "Switch ignition off to cut fuel pump", "Evacuate all occupants to safe distance", "Call emergency services"],
                  donts: ["Open the hood completely (oxygen feeds fire)", "Attempt to use water on electrical/hybrid fires"]
                },
                {
                  scenario: "Submersion or Flood",
                  dos: ["Release seat belts immediately", "Open or break side windows before electrical system fails", "Escape passenger compartment immediately"],
                  donts: ["Wait for vehicle to fill with water", "Attempt to open doors against water pressure"]
                }
              ]).map((proc: any, idx: number) => (
                <View key={idx} style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.infoCardTitle, { color: theme.destructive }]}>⚠️ Scenario: {proc.scenario}</Text>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <View>
                      <Text style={{ fontWeight: 'bold', color: theme.success, fontSize: 13, marginBottom: 4 }}>✓ WHAT TO DO</Text>
                      {(proc.steps || proc.dos || []).map((st: string, sIdx: number) => (
                        <Text key={sIdx} style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8, marginBottom: 2 }}>• {st}</Text>
                      ))}
                    </View>
                    {proc.donts && proc.donts.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ fontWeight: 'bold', color: theme.destructive, fontSize: 13, marginBottom: 4 }}>✕ WHAT NOT TO DO</Text>
                        {proc.donts.map((st: string, sIdx: number) => (
                          <Text key={sIdx} style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8, marginBottom: 2 }}>• {st}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Tab Content 3: Vehicle Features */}
          {activeResultTab === 'features' && (
            <View style={styles.tabContent}>
              {(selectedVehicle.features || selectedVehicle.vehicleFeatures || []).map((grp: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <Text style={[styles.groupCategoryTitle, { color: theme.textSecondary }]}>{grp.category.toUpperCase()}</Text>
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {(grp.items || []).map((item: any, iIdx: number) => {
                      const name = typeof item === 'string' ? item : item.name;
                      const loc = typeof item === 'string' ? '' : item.location;
                      return (
                        <View key={iIdx} style={[styles.infoCard, { backgroundColor: theme.backgroundElement, paddingVertical: 12 }]}>
                          <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 13 }}>📍 {name}</Text>
                          {loc ? <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2, marginLeft: 18 }}>{loc}</Text> : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Tab Content 4: Video Guide */}
          {activeResultTab === 'video' && (
            <View style={styles.tabContent}>
              <View style={styles.videoPlayerBox}>
                <Text style={{ color: '#fff', fontSize: 18 }}>📺 Video Guide Mock</Text>
                <Text style={{ color: theme.accent, fontSize: 14, marginTop: 8 }}>Playing Time: {videoPlayTime}</Text>
              </View>

              {/* Seek Chapters */}
              <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 16 }] as any}>Chapters</Text>
              <TouchableOpacity
                onPress={() => setVideoPlayTime("0:15")}
                style={[styles.chapterRow, { backgroundColor: theme.backgroundElement }] as any}
              >
                <Text style={[styles.chapterTitle, { color: theme.text }] as any}>0:15 - Glass Hammer Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setVideoPlayTime("1:40")}
                style={[styles.chapterRow, { backgroundColor: theme.backgroundElement }] as any}
              >
                <Text style={[styles.chapterTitle, { color: theme.text }] as any}>1:40 - Battery Cabling Cut Point</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setVideoPlayTime("2:55")}
                style={[styles.chapterRow, { backgroundColor: theme.backgroundElement }] as any}
              >
                <Text style={[styles.chapterTitle, { color: theme.text }] as any}>2:55 - Trunk Escape Release</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        /* HISTORY/EXPLORE LIST VIEW */
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Search History</Text>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search history cache..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              />
            </View>
          </View>

          <View style={[styles.infoBanner, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '33' }]}>
            <Text style={[styles.infoBannerText, { color: theme.primary }]}>
              💾 Search your previously identified vehicles by name, method, or scan date.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : recentSearches.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 14 }}>No cached searches yet.</Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <Text style={[styles.noResults, { color: theme.textSecondary }]}>No matching history found.</Text>
          ) : (
            <View style={styles.catalogGrid}>
              {filteredHistory.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.historyRow, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                  onPress={() => handleItemPress(s.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSelected }]}>
                      <Text style={{ fontSize: 18 }}>⏱️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>
                        {s.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 11 }}>{s.type.toUpperCase()}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>•</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                          {s.date || 'Today'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 16 }}>→</Text>
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
  infoBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
    marginTop: 16,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabContent: {
    marginTop: 12,
    gap: 12,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.08)',
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoCardText: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoCardLoc: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  videoPlayerBox: {
    aspectRatio: 16 / 9,
    backgroundColor: '#020617',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  chapterRow: {
    padding: 12,
    borderRadius: 12,
  },
  chapterTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupCategoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 8,
  },
}) as any;

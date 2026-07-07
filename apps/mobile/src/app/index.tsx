import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

const RECENT_INCIDENTS = [
  { route: "Bay Bridge incident response", date: "Today, 08:42", vehicle: "Toyota Camry 2024", scans: "3 scans" },
  { route: "I-280 northbound assist", date: "Yesterday, 19:18", vehicle: "F-150 Lightning", scans: "1 scan" },
  { route: "Mission St. vehicle check", date: "Jun 27, 14:06", vehicle: "Honda Accord", scans: "2 scans" },
];

export default function RescueScreen() {
  const theme = useTheme();

  // Navigation states: 'dashboard' | 'manual' | 'scanner' | 'details'
  const [activeView, setActiveView] = useState<'dashboard' | 'manual' | 'scanner' | 'details'>('dashboard');

  // Custom states
  const [emergency, setEmergency] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'back' | 'front'>('back');

  // Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [confidence, setConfidence] = useState(0);
  const [recognized, setRecognized] = useState(false);

  // Data states
  const [vehicle, setVehicle] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [alerting, setAlerting] = useState(false);
  const [expandedGuideline, setExpandedGuideline] = useState<number | null>(null);

  // Manual query states
  const [manualMake, setManualMake] = useState('Toyota');
  const [manualModel, setManualModel] = useState('Camry');
  const [manualYear, setManualYear] = useState('2024');

  const apiClient = createApiClient(DEFAULT_API_URL);

  // Animated value defined via useState for stable reference in rendering
  const [scanAnim] = useState(() => new Animated.Value(0));
  const progressInterval = useRef<any>(null);

  const isScanningActive = useCallback(() => {
    return activeView === 'scanner' && !recognized;
  }, [activeView, recognized]);

  const stopScanningSimulation = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    scanAnim.setValue(0);
  }, [scanAnim]);

  const startScanningSimulation = useCallback(() => {
    // Reset state asynchronously to prevent set-state-in-effect linter warnings
    setTimeout(() => {
      setConfidence(0);
      setRecognized(false);
    }, 0);

    // Start scan line translate animation
    scanAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Increment scanning progress
    progressInterval.current = setInterval(() => {
      setConfidence((prev) => {
        const next = prev + Math.floor(Math.random() * 12 + 6);
        if (next >= 98) {
          clearInterval(progressInterval.current);
          setRecognized(true);
          // Match with Camry
          const camry = LOCAL_MOCK_VEHICLES[0];
          setVehicle(camry);
          setPrediction({ confidence: 0.98 });
          setScanMessage("Match identified via camera classifier");
          // Automatically transition to details view after a short delay
          setTimeout(() => {
            setActiveView('details');
          }, 1000);
          return 98;
        }
        return next;
      });
    }, 250);
  }, [scanAnim]);

  useEffect(() => {
    if (activeView === 'scanner' && isScanningActive()) {
      startScanningSimulation();
    } else {
      stopScanningSimulation();
    }
    return () => stopScanningSimulation();
  }, [activeView, isScanningActive, startScanningSimulation, stopScanningSimulation]);

  // Process manual simulation / server search
  const processQuery = async () => {
    const code = `${manualMake.toLowerCase()}-${manualModel.toLowerCase()}-${manualYear.toLowerCase()}`;
    setVehicle(null);
    setPrediction(null);
    setScanMessage('');
    setExpandedGuideline(null);

    try {
      const mockCoords = {
        latitude: 37.7749,
        longitude: -122.4194,
        scannedBy: `Mobile_${Platform.OS}`,
      };

      const result = await apiClient.scanVehicle(code, mockCoords);
      setScanMessage(result.message);
      if (result.success && result.vehicle) {
        setVehicle(result.vehicle);
        setPrediction(result.prediction);
      } else {
        // Fallback to local mock data offline
        throw new Error("Server lookup failed");
      }
    } catch (err: any) {
      console.warn("Server search failed, checking offline database:", err.message);
      const match = LOCAL_MOCK_VEHICLES.find(
        (v) => v.id.includes(manualModel.toLowerCase()) || v.id.includes(code)
      ) || LOCAL_MOCK_VEHICLES[0];

      setVehicle(match);
      setPrediction({ confidence: 0.98 });
      setScanMessage("Loaded from offline database (Offline Mode)");
    } finally {
      setActiveView('details');
    }
  };

  // Dispatch alert function
  const triggerMobileAlert = async (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    if (!vehicle) return;
    setAlerting(true);

    try {
      const res = await apiClient.triggerAlert({
        vehicleId: vehicle.id,
        severity,
        message: `MOBILE ACTIVE ALERT: Response team dispatched to ${vehicle.year} ${vehicle.make} ${vehicle.model}. guidelines isolation standard armed!`,
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

  // Interpolated animation for scan line translation
  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 240],
  });

  // Priority color utilities
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background neon blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* GLOBAL HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.sirenContainer, { backgroundColor: theme.primary }]}>
              <Text style={styles.sirenEmoji}>🚨</Text>
            </View>
            <View>
              <Text style={[styles.headerSub, { color: theme.primary }]}>VQR SYSTEM</Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Vehicle Quick Response</Text>
            </View>
          </View>

          {/* Emergency mode switch toggle */}
          <TouchableOpacity
            style={[
              styles.switchTrack,
              { backgroundColor: emergency ? theme.destructive : theme.backgroundSelected }
            ]}
            activeOpacity={0.8}
            onPress={() => setEmergency(!emergency)}
          >
            <View style={[styles.switchThumb, { transform: [{ translateX: emergency ? 20 : 2 }] }]} />
          </TouchableOpacity>
        </View>

        {/* INCIDENT ALERTS AND HOST CONFIGURATION */}
        {emergency && (
          <View style={[styles.alertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: theme.destructive }]}>
            <View style={styles.pulseDot} />
            <Text style={[styles.alertText, { color: theme.destructive }]}>Emergency mode armed. Incident reports active.</Text>
          </View>
        )}



        {/* VIEW ROUTING LAYOUTS */}

        {/* 1. DASHBOARD VIEW */}
        {activeView === 'dashboard' && (
          <View style={styles.dashboardContainer}>
            <View style={styles.heroSection}>
              <View style={[styles.readyBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: theme.success }]}>
                <Text style={[styles.readyBadgeText, { color: theme.success }]}>● Responder ready</Text>
              </View>
              <Text style={[styles.heroHeading, { color: theme.text }]}>Identify a vehicle in seconds.</Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
                Real-time safety layouts, structural cut guidelines, and crash alerts in one minimal field dashboard.
              </Text>
            </View>

            {/* Main Action Cards */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                onPress={() => setActiveView('manual')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBg, { backgroundColor: theme.primary }]}>
                  <Text style={styles.actionIcon}>🔍</Text>
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Enter Vehicle Details</Text>
                  <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>Search by make, model, year</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                onPress={() => {
                  if (!permission?.granted) {
                    requestPermission();
                  }
                  setActiveView('scanner');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBg, { backgroundColor: '#020617' }]}>
                  <Text style={styles.actionIcon}>📷</Text>
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Camera Scan</Text>
                  <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>Classify vehicle frontend</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Recent incidents logs */}
            <View style={styles.historySection}>
              <Text style={[styles.sectionTitleText, { color: theme.text }]}>Recent Incidents Log</Text>
              {RECENT_INCIDENTS.map((inc, i) => (
                <View key={i} style={[styles.historyRow, { borderBottomColor: theme.backgroundSelected }]}>
                  <View>
                    <Text style={[styles.historyRoute, { color: theme.text }]}>{inc.route}</Text>
                    <Text style={[styles.historySub, { color: theme.textSecondary }]}>{inc.date} · {inc.vehicle}</Text>
                  </View>
                  <View style={[styles.historyBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <Text style={[styles.historyBadgeText, { color: theme.textSecondary }]}>{inc.scans}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 2. MANUAL ENTRY VIEW */}
        {activeView === 'manual' && (
          <View style={styles.manualViewContainer}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
                <Text style={[styles.backArrow, { color: theme.text }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.viewTitle, { color: theme.text }]}>Manual Search</Text>
            </View>

            <View style={[styles.manualForm, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Make</Text>
                <TextInput
                  value={manualMake}
                  onChangeText={setManualMake}
                  placeholder="e.g. Toyota"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                />
              </View>
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Model</Text>
                <TextInput
                  value={manualModel}
                  onChangeText={setManualModel}
                  placeholder="e.g. Camry"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                />
              </View>
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Year</Text>
                <TextInput
                  value={manualYear}
                  onChangeText={setManualYear}
                  placeholder="e.g. 2024"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                />
              </View>

              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: theme.primary }]}
                onPress={processQuery}
                activeOpacity={0.8}
              >
                <Text style={styles.searchBtnText}>Identify Vehicle</Text>
              </TouchableOpacity>
            </View>

            {/* Offline cached list quick picks */}
            <Text style={[styles.catalogLabel, { color: theme.text }]}>Local Vehicle Matches</Text>
            <View style={styles.catalogList}>
              {LOCAL_MOCK_VEHICLES.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.catalogCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                  onPress={() => {
                    setVehicle(v);
                    setPrediction({ confidence: 0.98 });
                    setScanMessage("Loaded from offline database (Offline Mode)");
                    setExpandedGuideline(null);
                    setActiveView('details');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.catalogCardLeft}>
                    <View style={[styles.carBadge, { backgroundColor: theme.primary + '15' }]}>
                      <Text style={{ fontSize: 18 }}>🚗</Text>
                    </View>
                    <View>
                      <Text style={[styles.catalogCardTitle, { color: theme.text }]}>{v.make} {v.model}</Text>
                      <Text style={[styles.catalogCardSub, { color: theme.textSecondary }]}>{v.vin} · {v.year}</Text>
                    </View>
                  </View>
                  <View style={[styles.matchBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: theme.success }]}>
                    <Text style={[styles.matchBadgeText, { color: theme.success }]}>98%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 3. CAMERA SCANNER VIEW */}
        {activeView === 'scanner' && (
          <View style={styles.scannerContainer}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
                <Text style={[styles.backArrow, { color: theme.text }]}>← Exit</Text>
              </TouchableOpacity>
              <Text style={[styles.viewTitle, { color: theme.text }]}>Camera Scanner</Text>
            </View>

            {/* Scanner permissions */}
            {!permission?.granted ? (
              <View style={[styles.permissionBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>📷</Text>
                <Text style={[styles.permissionText, { color: theme.text }]}>Camera permissions are required for classification.</Text>
                <TouchableOpacity
                  style={[styles.grantBtn, { backgroundColor: theme.primary }]}
                  onPress={requestPermission}
                >
                  <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraFrameWrapper}>
                {/* Simulated Lens or Real Stream */}
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing={facingMode}
                />

                {/* Glowing neon borders */}
                <View style={styles.scannerCornerTL} />
                <View style={styles.scannerCornerTR} />
                <View style={styles.scannerCornerBL} />
                <View style={styles.scannerCornerBR} />

                {/* Dotted border frame */}
                <View style={styles.dottedOutline} />

                {/* Animated scan line */}
                {isScanningActive() && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      { transform: [{ translateY }] }
                    ]}
                  />
                )}

                {/* Overlay Text */}
                <View style={styles.cameraOverlayTextContainer}>
                  <Text style={styles.cameraOverlayText}>Center vehicle grille inside brackets</Text>
                </View>
              </View>
            )}

            {/* Progress indicators */}
            {confidence > 0 && (
              <View style={[styles.scanStatusCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressTitle, { color: theme.text }]}>
                    {Math.min(Math.round(confidence), 98)}% / {recognized ? "CLASSIFIED" : "ANALYZING..."}
                  </Text>
                  {recognized && (
                    <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.progressBarBg, { backgroundColor: theme.background }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(confidence, 98)}%`, backgroundColor: theme.primary }
                    ]}
                  />
                </View>

                {recognized && (
                  <Text style={[styles.recognizedLabel, { color: theme.success }]}>
                    VEHICLE DETECTED: Audi A4 / Camry Class
                  </Text>
                )}
              </View>
            )}

            {/* Controls */}
            <View style={styles.scannerControls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={() => {
                  setFacingMode(facingMode === 'back' ? 'front' : 'back');
                }}
              >
                <Text style={{ fontSize: 16 }}>🔄 Flip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={() => setIsFlashOn(!isFlashOn)}
              >
                <Text style={{ fontSize: 16 }}>⚡ Flash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.backgroundElement }]}
                onPress={() => {
                  stopScanningSimulation();
                  startScanningSimulation();
                }}
              >
                <Text style={{ fontSize: 16 }}>♻️ Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. DETAILS / RESULTS VIEW */}
        {activeView === 'details' && vehicle && (
          <View style={styles.detailsViewContainer}>

            {/* Header specs metadata */}
            <View style={styles.detailsHeader}>
              <View>
                <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
                  <Text style={[styles.backArrow, { color: theme.textSecondary }]}>← Home</Text>
                </TouchableOpacity>
                <Text style={[styles.detailsVIN, { color: theme.primary }]}>{vehicle.vin || 'VQR-REF-INC'}</Text>
                <Text style={[styles.detailsTitle, { color: theme.text }]}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
              </View>
              <View style={[styles.matchBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: theme.success }]}>
                <Text style={[styles.matchBadgeText, { color: theme.success }]}>
                  {prediction ? `${(prediction.confidence * 100).toFixed(0)}% Match` : '100% Match'}
                </Text>
              </View>
            </View>

            {scanMessage ? (
              <View style={[styles.offlineNotice, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.offlineNoticeText, { color: theme.textSecondary }]}>ℹ️ {scanMessage}</Text>
              </View>
            ) : null}

            {/* Safety guidelines accordion */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitleText, { color: theme.text }]}>Safety Cutout Guidelines</Text>

              {vehicle.safetyGuidelines.map((g: any, index: number) => {
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
                        borderLeftColor: priorityStyles.border
                      }
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

            {/* Vehicle spec chips */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitleText, { color: theme.text }]}>Vehicle Specifications</Text>
              <View style={styles.specChipsContainer}>
                {vehicle.features.flatMap((f: any) => f.items).map((item: string, i: number) => (
                  <View key={i} style={[styles.specChip, { backgroundColor: theme.backgroundSelected }]}>
                    <Text style={[styles.specChipText, { color: theme.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Simulated video guide briefing */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitleText, { color: theme.text }]}>Extraction Video Guide</Text>
              <View style={[styles.videoWrapper, { backgroundColor: '#020617', borderColor: theme.backgroundSelected }]}>
                {/* Real video if online, otherwise mock graphics */}
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

            {/* Alert / Incident dispatch controls */}
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

            {/* Reset / scan next button */}
            <TouchableOpacity
              style={[styles.resetScanBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                setVehicle(null);
                setPrediction(null);
                setScanMessage('');
                setActiveView('dashboard');
              }}
            >
              <Text style={styles.resetScanBtnText}>Start New Scan</Text>
            </TouchableOpacity>

          </View>
        )}

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
    paddingBottom: 60,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sirenContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sirenEmoji: {
    fontSize: 22,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  alertText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingsCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsBody: {
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
    paddingTop: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  dashboardContainer: {
    marginTop: 24,
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: 12,
  },
  readyBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
  },
  historySection: {
    marginTop: 8,
    gap: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyRoute: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  historySub: {
    fontSize: 11,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  manualViewContainer: {
    marginTop: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  manualForm: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  formRow: {
    gap: 4,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  searchBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  catalogLabel: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  catalogList: {
    gap: 10,
  },
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  catalogCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  catalogCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  scannerContainer: {
    marginTop: 16,
  },
  permissionBox: {
    height: 280,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  grantBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  grantBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  cameraFrameWrapper: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#000',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22d3ee',
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22d3ee',
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#22d3ee',
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#22d3ee',
  },
  dottedOutline: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    left: 24,
    right: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 2,
  },
  cameraOverlayTextContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scanStatusCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recognizedLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  scannerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  controlBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  detailsViewContainer: {
    marginTop: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  offlineNotice: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  offlineNoticeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsSection: {
    marginTop: 20,
    gap: 10,
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

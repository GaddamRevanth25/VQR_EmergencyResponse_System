import React, { useState } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { createApiClient } from '@vqr/shared';

// Host configurations
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export default function RescueScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_API_URL);
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<any>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [prediction, setPrediction] = useState<any>(null);
  const [alerting, setAlerting] = useState(false);

  // Manual simulator state
  const [manualCode, setManualCode] = useState('toyota-camry-2024');

  const apiClient = createApiClient(backendUrl);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await processScan(data);
  };

  const processScan = async (code: string) => {
    setLoading(true);
    setVehicle(null);
    setPrediction(null);
    setScanMessage('');

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
        Alert.alert('Scan Result', result.message);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Connection Failure', `Could not reach backend API at ${backendUrl}. Ensure host is online.`);
    } finally {
      setLoading(false);
    }
  };

  const triggerMobileAlert = async (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    if (!vehicle) return;
    setAlerting(true);

    try {
      const res = await apiClient.triggerAlert({
        vehicleId: vehicle.id,
        severity,
        message: `MOBILE FIELD ALERT: Active rescue scan on ${vehicle.year} ${vehicle.make} ${vehicle.model}. Ensure high-voltage isolation guidelines are followed!`,
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

  // Color mappings
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header configs */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>VQR Field Scanner</Text>
          <View style={styles.ipContainer}>
            <Text style={styles.label}>Backend Host IP:</Text>
            <TextInput
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://192.168.1.x:8000"
              placeholderTextColor="#666"
              style={styles.input}
            />
          </View>
        </View>

        {/* Scan outcome or camera view */}
        {!vehicle && !loading && (
          <View style={styles.scanSection}>
            {permission?.granted ? (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
                <View style={styles.overlayTextContainer}>
                  <Text style={styles.overlayText}>Point camera at Vehicle QR code</Text>
                </View>
              </View>
            ) : (
              <View style={styles.permissionContainer}>
                <Text style={styles.noPermissionText}>Camera access is required to scan QR codes.</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                  <Text style={styles.buttonText}>Grant Camera Permission</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Simulated manual entry */}
            <View style={styles.manualContainer}>
              <Text style={styles.manualLabel}>Simulation override (select vehicle ID):</Text>
              <View style={styles.simRow}>
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="e.g. tesla-model-y-2023"
                  placeholderTextColor="#666"
                  style={[styles.input, styles.simInput]}
                />
                <TouchableOpacity style={styles.simButton} onPress={() => processScan(manualCode)}>
                  <Text style={styles.simButtonText}>Simulate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={styles.loadingText}>Fetching rescue specs & analyzing ML weights...</Text>
          </View>
        )}

        {/* Vehicle spec display */}
        {vehicle && (
          <View style={styles.detailsContainer}>
            {/* Header info */}
            <View style={styles.vehicleHeader}>
              <View>
                <Text style={styles.vehicleTitle}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
                <Text style={styles.vehicleSubtitle}>ID Ref: {vehicle.id}</Text>
                {scanMessage ? (
                  <Text style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                    {scanMessage}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.resetButton} onPress={() => { setVehicle(null); setScanned(false); }}>
                <Text style={styles.resetButtonText}>Scan Next</Text>
              </TouchableOpacity>
            </View>

            {/* ML Prediction */}
            {prediction && (
              <View style={styles.mlCard}>
                <Text style={styles.mlHeader}>ML Prediction Stats</Text>
                <View style={styles.mlRow}>
                  <Text style={styles.mlLabel}>Confidence:</Text>
                  <Text style={styles.mlValue}>{(prediction.confidence * 100).toFixed(1)}%</Text>
                </View>
                <Text style={styles.mlSubText}>Weights initialized on demand in FastAPI service.</Text>
              </View>
            )}

            {/* Video Playback */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extraction Video Guide</Text>
              <View style={styles.videoWrapper}>
                <Video
                  source={{ uri: `${backendUrl}/public${vehicle.videoUrl}` }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  useNativeControls
                  style={styles.video}
                  onError={(err) => console.log('Video error:', err)}
                />
              </View>
            </View>

            {/* Safety guidelines */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety Cutout Guidelines</Text>
              {vehicle.safetyGuidelines.map((g: any, index: number) => {
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
              {vehicle.features.map((f: any, index: number) => (
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
          </View>
        )}
      </ScrollView>
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
  ipContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#aaa',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#16171d',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 12,
    width: 200,
  },
  scanSection: {
    gap: 20,
  },
  cameraWrapper: {
    height: 350,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayTextContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16171d',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  noPermissionText: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  manualContainer: {
    backgroundColor: '#16171d',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  manualLabel: {
    color: '#bbb',
    fontSize: 13,
    marginBottom: 8,
  },
  simRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simInput: {
    flex: 1,
  },
  simButton: {
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  simButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
  detailsContainer: {
    gap: 20,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 16,
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
  mlCard: {
    backgroundColor: 'rgba(99,102,241,0.05)',
    borderColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  mlHeader: {
    color: '#6366f1',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  mlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mlLabel: {
    color: '#999',
    fontSize: 13,
  },
  mlValue: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
  },
  mlSubText: {
    color: '#555',
    fontSize: 10,
  },
  section: {
    gap: 12,
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

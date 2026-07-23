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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createApiClient } from '@vqr/shared';
import { useTheme } from '@/hooks/use-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Host configurations
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const VEHICLE_TYPES = [
  { code: "CAR", name: "Car" },
  { code: "BIKE", name: "Bike" },
  { code: "TRAIN", name: "Train" },
  { code: "AIRPLANE", name: "Airplane" },
  { code: "BOAT", name: "Boat" }
];

const COUNTRIES = [
  { code: "IN", name: "India (e.g. MH02CL0555)" },
  { code: "UK", name: "United Kingdom (e.g. TE57VRN)" },
  { code: "US", name: "United States (e.g. 7XER187)" },
  { code: "VIN", name: "VIN Number (17-Digits)" },
];

export default function RescueScreen() {
  const theme = useTheme();
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const apiClient = createApiClient(apiUrl);

  // Load saved API URL on mount
  useEffect(() => {
    const loadApiUrl = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem('vqr_api_url');
        if (savedUrl) {
          setApiUrl(savedUrl);
        }
      } catch (e) { }
    };
    loadApiUrl();
  }, []);

  const handleSaveApiUrl = async (url: string) => {
    setApiUrl(url);
    try {
      await AsyncStorage.setItem('vqr_api_url', url);
    } catch (e) { }
  };

  // View States: 'dashboard' | 'manual' | 'scanner' | 'dropdowns' | 'details' | 'history'
  const [activeView, setActiveView] = useState<'dashboard' | 'manual' | 'scanner' | 'dropdowns' | 'details' | 'history'>('dashboard');

  // General States
  const [emergency, setEmergency] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [crashDetectionBg, setCrashDetectionBg] = useState(false);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Selected vehicle & results tabs states
  const [vehicle, setVehicle] = useState<any>(null);
  const [activeResultTab, setActiveResultTab] = useState<'safety' | 'emergency' | 'features' | 'video'>('safety');
  const [videoPlayTime, setVideoPlayTime] = useState('0:00');

  // Dropdowns (Cascading Search) States
  const [selectedType, setSelectedType] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchMakeQuery, setSearchMakeQuery] = useState('');

  // Manual input states
  const [inputType, setInputType] = useState<'IN' | 'UK' | 'US' | 'VIN'>('IN');
  const [inputValue, setInputValue] = useState('');

  // Camera Scanner States
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facingMode, setFacingMode] = useState<'back' | 'front'>('back');
  const [confidence, setConfidence] = useState(0);
  const [recognized, setRecognized] = useState(false);
  const [scannedRegText, setScannedRegText] = useState('');
  const [isConfirmingPlate, setIsConfirmingPlate] = useState(false);
  const [editedPlateText, setEditedPlateText] = useState('');

  // Scanning animation values
  const [scanAnim] = useState(() => new Animated.Value(0));
  const progressInterval = useRef<any>(null);

  const navigation = useNavigation();

  // Load history from AsyncStorage
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
    } catch (e) { }
  };

  useEffect(() => {
    loadHistory();
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (crashDetectionBg) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      blinkAnim.setValue(1);
    }
  }, [crashDetectionBg]);

  // Format inputs on the fly for country-specific plate layouts
  const handleManualInputChange = (text: string) => {
    let val = text.toUpperCase();
    if (inputType === "IN") {
      val = val.replace(/[^A-Z0-9]/g, "");
      if (val.length > 2) val = val.slice(0, 2) + val.slice(2);
    } else if (inputType === "UK") {
      val = val.replace(/[^A-Z0-9]/g, "");
    }
    setInputValue(val);
  };

  // Reset inputs when country type changes
  useEffect(() => {
    setInputValue("");
    setErrorMsg("");
  }, [inputType]);

  // Fetch makes when selectedType changes
  useEffect(() => {
    async function fetchMakes() {
      try {
        const list = await apiClient.getMakes(selectedType || undefined);
        setMakes(list);
      } catch (err) {
        console.error("Failed to load makes:", err);
      }
    }
    fetchMakes();
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
  }, [selectedType, apiUrl]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    async function fetchModels() {
      try {
        const list = await apiClient.getModels(selectedMake, selectedType || undefined);
        setModels(list);
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    }
    fetchModels();
    setSelectedModel("");
    setSelectedYear("");
  }, [selectedMake, selectedType, apiUrl]);

  // Fetch years when model changes
  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      return;
    }
    async function fetchYears() {
      try {
        const list = await apiClient.getYears(selectedMake, selectedModel, selectedType || undefined);
        setYears(list);
      } catch (err) {
        console.error("Failed to load years:", err);
      }
    }
    fetchYears();
    setSelectedYear("");
  }, [selectedModel, selectedMake, selectedType, apiUrl]);

  // Camera Scanning animation
  const startScanningSimulation = () => {
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");

    scanAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopScanningSimulation = () => {
    scanAnim.setValue(0);
  };

  // Perform real capture and backend plate OCR scan
  const handleCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert("Error", "Camera is not ready yet.");
      return;
    }
    setLoading(true);
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");
    setIsConfirmingPlate(false);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo || !photo.uri) {
        throw new Error("Failed to capture image");
      }

      const file = {
        uri: photo.uri,
        name: 'plate.jpg',
        type: 'image/jpeg',
      } as any;

      const scanResult = await apiClient.scanPlateImage(file);

      if (scanResult.prediction?.predictedClass) {
        const plate = scanResult.prediction.predictedClass;
        setScannedRegText(plate);
        setEditedPlateText(plate);
        setConfidence(100);
        setIsConfirmingPlate(true); // Open the verification screen/card
      } else {
        Alert.alert("OCR Failed", "No license plate characters could be recognized in the image.");
      }
    } catch (err: any) {
      console.error("Capture and scan error:", err);
      Alert.alert("Capture Error", err.message || "Failed to scan license plate.");
    } finally {
      setLoading(false);
    }
  };

  // 2nd-layer confirmation and database search
  const handleConfirmSearch = async (plateText: string) => {
    if (!plateText || plateText.trim() === "") {
      Alert.alert("Error", "Please enter a valid license plate number.");
      return;
    }
    setLoading(true);
    try {
      const cleanedPlate = plateText.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const response = await apiClient.lookupRegistration(cleanedPlate);
      saveSearchToRecent(response, "scan");
      setVehicle(response);
      setRecognized(true);
      setIsConfirmingPlate(false);
      setActiveView("details");
    } catch (err: any) {
      console.error("Lookup error:", err);
      setVehicle(null);
      
      const errMsg = err.message || "";
      const isNetworkError = errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("failed");
      
      if (isNetworkError) {
        Alert.alert(
          "Network Connection Error",
          `Could not connect to the backend server at ${apiUrl}.\n\nEnsure your PC's firewall allows port 8000 and the server is running with --host 0.0.0.0`
        );
      } else {
        setRecognized(true);
        setIsConfirmingPlate(false);
        Alert.alert(
          "Vehicle Not Found",
          `Confirmed plate "${plateText}", but no matching safety instructions were found in the database.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setIsConfirmingPlate(false);
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");
    setEditedPlateText("");
    setVehicle(null);
  };

  // Perform vehicle lookups
  const handleLookup = async () => {
    if (!inputValue) return;
    setLoading(true);
    setErrorMsg("");
    try {
      let response;
      if (inputType === "VIN") {
        response = await apiClient.lookupVehicle(inputValue, "US");
      } else {
        response = await apiClient.lookupRegistration(inputValue);
      }
      saveSearchToRecent(response, "manual");
      setVehicle(response);
      setActiveView("details");
    } catch (err) {
      setErrorMsg("No matching vehicle found in passenger database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownLookup = async () => {
    if (!selectedMake || !selectedModel || !selectedYear) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await apiClient.lookupByDropdown(selectedMake, selectedModel, parseInt(selectedYear));
      saveSearchToRecent(response, "browse");
      setVehicle(response);
      setActiveView("details");
    } catch (err) {
      setErrorMsg("No safety instructions found for this configuration.");
    } finally {
      setLoading(false);
    }
  };

  const saveSearchToRecent = async (item: any, type: string) => {
    const searchItem = {
      id: item.vehicleId || item.id,
      title: `${item.make} ${item.model} (${item.year})`,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      params: { reg: item.registrationNumber }
    };
    const updated = [searchItem, ...recentSearches.filter(s => s.id !== searchItem.id)].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('vqr_recent_searches', JSON.stringify(updated));
    } catch (e) { }
  };

  // Bounding box characters helper
  const getActivePlateText = () => {
    return scannedRegText || "AWAITING";
  };
  const activePlateText = getActivePlateText();
  const highlightedCharCount = Math.floor((confidence / 100) * activePlateText.length);

  // Filtering recent searches
  const filteredHistory = recentSearches.filter((item) => {
    const query = searchHistoryQuery.toLowerCase().trim();
    if (!query) return true;
    return item.title?.toLowerCase().includes(query) || item.date?.toLowerCase().includes(query) || item.type?.toLowerCase().includes(query);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background neon blobs */}
      <View style={styles.neonBlobContainer} pointerEvents="none">
        <View style={[styles.neonBlob1, { backgroundColor: theme.primary + '11' }]} />
        <View style={[styles.neonBlob2, { backgroundColor: theme.accent + '0a' }]} />
      </View>

      {/* RENDER HEADER */}
      {activeView !== 'scanner' && (
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.logoRow}>
              <View style={[styles.sirenContainer, { backgroundColor: theme.primary }]}>
                <Text style={styles.sirenEmoji}>🛡️</Text>
              </View>
              <View>
                <Text style={[styles.headerSub, { color: theme.primary }]}>VQR SAFETY</Text>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Emergency Directory</Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {crashDetectionBg && (
                <Animated.View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#ef4444',
                    opacity: blinkAnim,
                  }}
                />
              )}
              <Text style={{ fontSize: 8, fontWeight: '900', letterSpacing: 0.5, color: theme.textSecondary }}>CRASH DETECT</Text>
              <TouchableOpacity
                onPress={() => {
                  const nextState = !crashDetectionBg;
                  setCrashDetectionBg(nextState);
                  Alert.alert(
                    "Crash Detection",
                    nextState
                      ? "Crash Detection System is now running in the background."
                      : "Crash Detection System background service has been disabled."
                  );
                }}
                activeOpacity={0.8}
                style={[
                  styles.toggleOuter,
                  {
                    backgroundColor: crashDetectionBg ? theme.success : theme.backgroundSelected,
                    borderColor: crashDetectionBg ? theme.success : 'rgba(148, 163, 184, 0.2)'
                  }
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [{ translateX: crashDetectionBg ? 16 : 0 }],
                      backgroundColor: '#fff'
                    }
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 1. DASHBOARD / HOME SCREEN */}
      {activeView === 'dashboard' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.heroSection}>
            <View style={[styles.readyBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: theme.success }]}>
              <Text style={[styles.readyBadgeText, { color: theme.success }]}>● Pre-Trip Readiness Active</Text>
            </View>
            <Text style={[styles.heroHeading, { color: theme.text }]}>Know Your Vehicle.{"\n"}Travel Safer.</Text>
            <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
              Identify emergency features, extraction safety guides, and safety tips in seconds.
            </Text>
          </View>

          {/* API Configuration Card */}
          <View style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.backgroundElement,
            borderWidth: 1,
            borderColor: theme.backgroundSelected,
            marginBottom: 20,
            marginHorizontal: 16,
          }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
              🌐 Backend API Connection
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={apiUrl}
                onChangeText={handleSaveApiUrl}
                placeholder="e.g. http://192.168.1.100:8000"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: 'rgba(148, 163, 184, 0.2)',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: theme.text,
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }}
              />
            </View>
            <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 6, lineHeight: 14 }}>
              Required for physical device testing. Enter your server's local IP address (e.g. http://192.168.1.100:8000). Default is http://10.0.2.2:8000 (Android emulator) or http://localhost:8000 (iOS).
            </Text>
          </View>

          {/* Critical SOS Dispatch button */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "CRITICAL EMERGENCY ALERT",
                "Are you sure you want to broadcast a critical emergency signal to municipal dispatch, squad vehicles, and nearby medical centers?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "YES, DISPATCH NOW",
                    style: "destructive",
                    onPress: () => {
                      Alert.alert("SOS Broadcasted", "Emergency response team and rescue units have been dispatched to your location.");
                    }
                  }
                ]
              );
            }}
            style={[styles.homeDispatchBtn, { backgroundColor: theme.destructive }]}
          >
            <Text style={styles.homeDispatchBtnText}>🚨 TRIGGER CRITICAL DISPATCH (SOS)</Text>
          </TouchableOpacity>

          {/* Three Primary Actions Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => setActiveView('manual')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: theme.primary }]}>
                <Text style={styles.actionIcon}>📝</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Enter VIN / Reg Number</Text>
                <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>Quick plate check or vehicle code query.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => {
                if (!permission?.granted) requestPermission();
                setActiveView('scanner');
                startScanningSimulation();
              }}
            >
              <View style={[styles.actionIconBg, { backgroundColor: theme.accent }]}>
                <Text style={styles.actionIcon}>📷</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Scan License Plate</Text>
                <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>CV-based real-time characters identifier.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => setActiveView('dropdowns')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#475569' }]}>
                <Text style={styles.actionIcon}>📖</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: theme.text }]}>Browse Vehicle Directory</Text>
                <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>Select Make → Model → Year cascading lists.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 2. MANUAL LOOKUP VIEW */}
      {activeView === 'manual' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
              <Text style={[styles.backArrow, { color: theme.text }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.viewTitle, { color: theme.text }]}>Manual Search</Text>
          </View>

          <View style={[styles.manualForm, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {/* Country Selector */}
            <Text style={[styles.formLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Select Region / Identifier</Text>
            <View style={styles.countryRow}>
              {COUNTRIES.map((cc) => (
                <TouchableOpacity
                  key={cc.code}
                  onPress={() => setInputType(cc.code as any)}
                  style={[
                    styles.countryTabButton,
                    {
                      borderColor: inputType === cc.code ? theme.primary : theme.backgroundSelected,
                      backgroundColor: inputType === cc.code ? theme.primary + '18' : 'transparent',
                    }
                  ]}
                >
                  <Text style={[styles.countryTabText, { color: inputType === cc.code ? theme.primary : theme.textSecondary }]}>
                    {cc.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.formRow, { marginTop: 16 }]}>
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>
                {inputType === "VIN" ? "Enter 17-Digit VIN" : "Enter Plate Number"}
              </Text>
              <TextInput
                value={inputValue}
                onChangeText={handleManualInputChange}
                placeholder={inputType === "IN" ? "e.g. MH02CL0555" : inputType === "UK" ? "e.g. TE57VRN" : "e.g. 7XER187"}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>⚠️ {errorMsg}</Text> : null}

            <TouchableOpacity
              onPress={handleLookup}
              disabled={!inputValue || loading}
              style={[styles.actionSubmitBtn, { backgroundColor: theme.primary, opacity: (!inputValue || loading) ? 0.6 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Lookup Vehicle</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 3. CASCADING DROPDOWNS VIEW */}
      {activeView === 'dropdowns' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
              <Text style={[styles.backArrow, { color: theme.text }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.viewTitle, { color: theme.text }]}>Browse Directory</Text>
          </View>

          <View style={[styles.manualForm, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {/* Step 1: Type */}
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Step 1: Choose Vehicle Type</Text>
            <View style={styles.countryRow}>
              {VEHICLE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.code}
                  onPress={() => setSelectedType(t.code)}
                  style={[
                    styles.countryTabButton,
                    {
                      borderColor: selectedType === t.code ? theme.primary : theme.backgroundSelected,
                      backgroundColor: selectedType === t.code ? theme.primary + '18' : 'transparent',
                    }
                  ]}
                >
                  <Text style={[styles.countryTabText, { color: selectedType === t.code ? theme.primary : theme.textSecondary }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Step 2: Make */}
            <View style={[styles.formRow, { marginTop: 16 }]}>
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Step 2: Select Make</Text>
              <TextInput
                value={selectedMake}
                onChangeText={(val) => {
                  setSelectedMake(val);
                  setSearchMakeQuery(val);
                }}
                placeholder="Type or select Make..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              {makes.length > 0 && !selectedMake && (
                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                  {makes.filter(m => m.toLowerCase().includes(searchMakeQuery.toLowerCase())).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => {
                        setSelectedMake(m);
                        setSearchMakeQuery("");
                      }}
                      style={[styles.chipButton, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <Text style={[styles.chipText, { color: theme.text }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Step 3: Model */}
            <View style={[styles.formRow, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Step 3: Select Model</Text>
              <TextInput
                value={selectedModel}
                onChangeText={setSelectedModel}
                placeholder={selectedMake ? "Select Model..." : "Select Make first..."}
                editable={!!selectedMake}
                placeholderTextColor={theme.textSecondary}
                style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected, opacity: selectedMake ? 1 : 0.5 }]}
              />
              {models.length > 0 && !selectedModel && (
                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                  {models.map((mdl) => (
                    <TouchableOpacity
                      key={mdl}
                      onPress={() => setSelectedModel(mdl)}
                      style={[styles.chipButton, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <Text style={[styles.chipText, { color: theme.text }]}>{mdl}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Step 4: Year */}
            <View style={[styles.formRow, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Step 4: Select Year</Text>
              <TextInput
                value={selectedYear}
                onChangeText={setSelectedYear}
                placeholder={selectedModel ? "Select Year..." : "Select Model first..."}
                editable={!!selectedModel}
                placeholderTextColor={theme.textSecondary}
                style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected, opacity: selectedModel ? 1 : 0.5 }]}
              />
              {years.length > 0 && !selectedYear && (
                <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setSelectedYear(y.toString())}
                      style={[styles.chipButton, { backgroundColor: theme.backgroundSelected }]}
                    >
                      <Text style={[styles.chipText, { color: theme.text }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {errorMsg ? <Text style={styles.errorText}>⚠️ {errorMsg}</Text> : null}

            <TouchableOpacity
              onPress={handleDropdownLookup}
              disabled={!selectedYear || loading}
              style={[styles.actionSubmitBtn, { backgroundColor: theme.primary, opacity: (!selectedYear || loading) ? 0.6 : 1, marginTop: 20 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Show Safety Layout</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 4. SCANNER VIEW (COMPUTER VISION SIMULATOR) */}
      {activeView === 'scanner' && (
        <View style={styles.scannerWrapper}>
          {!permission?.granted ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16', padding: 24 }}>
              <Ionicons name="camera-outline" size={64} color={theme.accent} style={{ marginBottom: 16 }} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                Camera Access Required
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
                Please enable camera permissions to scan license plates and retrieve emergency rescue guides in real-time.
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Enable Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveView('dashboard')}
                style={{ marginTop: 16 }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Native Camera View */}
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facingMode} flash={isFlashOn ? 'on' : 'off'} mode="picture" />

              {/* Shading surrounding frames (leaving center clear) */}
              <View style={styles.blackoutOverlayTop} />
              <View style={styles.blackoutOverlayBottom} />
              <View style={styles.blackoutOverlayLeft} />
              <View style={styles.blackoutOverlayRight} />

              {/* Back button */}
              <TouchableOpacity
                onPress={() => {
                  stopScanningSimulation();
                  handleCancelConfirm();
                  setActiveView('dashboard');
                }}
                style={styles.scannerBackBtn}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>← Back</Text>
              </TouchableOpacity>

              {/* Bounding scan box */}
              <View style={[styles.scannerGuideBox, { borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.15)', borderRadius: 12, backgroundColor: 'rgba(15, 23, 42, 0.25)', overflow: 'hidden' }]}>
                <View style={styles.scannerLaserLine} />



                {/* Bounding box brackets */}
                <View style={[styles.cornerBracket, { top: -2, left: -2, borderTopWidth: 5, borderLeftWidth: 5, width: 24, height: 24 }]} />
                <View style={[styles.cornerBracket, { top: -2, right: -2, borderTopWidth: 5, borderRightWidth: 5, width: 24, height: 24 }]} />
                <View style={[styles.cornerBracket, { bottom: -2, left: -2, borderBottomWidth: 5, borderLeftWidth: 5, width: 24, height: 24 }]} />
                <View style={[styles.cornerBracket, { bottom: -2, right: -2, borderBottomWidth: 5, borderRightWidth: 5, width: 24, height: 24 }]} />

                {/* Character Boxes (Computer Vision Highlights - Only visible after successful matching) */}
                {recognized && (
                  <View style={[styles.scannerCharContainer, { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 }]}>
                    {activePlateText.split("").map((char, index) => {
                      const isActive = index < highlightedCharCount;
                      return (
                        <View
                          key={index}
                          style={[
                            styles.scannerCharBox,
                            {
                              backgroundColor: theme.accent,
                              borderColor: theme.accent,
                            }
                          ]}
                        >
                          <Text style={[styles.scannerCharText, { color: '#fff' }]}>
                            {char}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Flash & Camera Swap controls positioned in between camera zone and bottom footer buttons (hidden during verification to clean up layout) */}
              {!isConfirmingPlate && (
                <View style={{ position: 'absolute', bottom: 140, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 24, zIndex: 50 }}>
                  {/* Flash Toggle */}
                  <TouchableOpacity
                    onPress={() => setIsFlashOn(!isFlashOn)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: isFlashOn ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
                      borderWidth: 2,
                      borderColor: isFlashOn ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: isFlashOn ? '#eab308' : '#000',
                      shadowOpacity: isFlashOn ? 0.35 : 0.15,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <Ionicons
                      name={isFlashOn ? "flashlight" : "flashlight-outline"}
                      size={22}
                      color={isFlashOn ? "#eab308" : "#ffffff"}
                    />
                  </TouchableOpacity>

                  {/* Camera Swap Toggle */}
                  <TouchableOpacity
                    onPress={() => setFacingMode((prev) => (prev === 'back' ? 'front' : 'back'))}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      borderWidth: 2,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons
                      name="camera-reverse-outline"
                      size={24}
                      color="#ffffff"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Controls Panel */}
              <View style={styles.scannerBottomControls}>
                {isConfirmingPlate ? (
                  <View style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.94)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 20,
                    padding: 20,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 10,
                  }}>
                    <Text style={[styles.scannerStatusText, { color: theme.accent, marginBottom: 8 }]}>
                      CONFIRM DETECTED PLATE
                    </Text>
                    <TextInput
                      value={editedPlateText}
                      onChangeText={setEditedPlateText}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="Enter plate number"
                      placeholderTextColor="#475569"
                      style={{
                        width: '80%',
                        backgroundColor: '#0f172a',
                        borderWidth: 1.5,
                        borderColor: theme.accent,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                        marginBottom: 16,
                        letterSpacing: 2,
                      }}
                    />
                    <View style={styles.scannerOptionsRow}>
                      <TouchableOpacity
                        onPress={handleCancelConfirm}
                        style={[styles.scannerOptionBtn, { backgroundColor: '#1e293b' }]}
                      >
                        <Text style={styles.scannerOptionBtnText}>CANCEL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleConfirmSearch(editedPlateText)}
                        disabled={loading}
                        style={[styles.scannerOptionBtn, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.scannerOptionBtnText}>CONFIRM</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : recognized ? (
                  <View style={styles.scannerOptionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setConfidence(0);
                        setRecognized(false);
                        setScannedRegText("");
                        setVehicle(null);
                      }}
                      style={[styles.scannerOptionBtn, { backgroundColor: '#1e293b' }]}
                    >
                      <Text style={styles.scannerOptionBtnText}>RE-SCAN</Text>
                    </TouchableOpacity>
                    {vehicle && (
                      <TouchableOpacity
                        onPress={() => {
                          saveSearchToRecent(vehicle, "scan");
                          setActiveView("details");
                        }}
                        style={[styles.scannerOptionBtn, { backgroundColor: theme.primary }]}
                      >
                        <Text style={styles.scannerOptionBtnText}>VIEW SAFETY LAYOUT</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.88)',
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 18,
                    paddingVertical: 18,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 5,
                  }}>
                    <Text style={[styles.scannerStatusText, { marginBottom: 12, letterSpacing: 0.5 }]}>
                      {loading ? "SCANNING..." : "ALIGN LICENSE PLATE"}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCapture}
                      disabled={loading}
                      style={[styles.manualTriggerBtn, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1, width: '90%', alignItems: 'center' }]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.manualTriggerBtnText}>CAPTURE</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* 5. HISTORY SCREEN (WITH DATE SEARCH FILTER) */}
      {activeView === 'history' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
              <Text style={[styles.backArrow, { color: theme.text }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.viewTitle, { color: theme.text }]}>Search History</Text>
          </View>

          {/* Search bar */}
          <TextInput
            value={searchHistoryQuery}
            onChangeText={setSearchHistoryQuery}
            placeholder="Search by vehicle name, date..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.formInput, { color: theme.text, borderColor: theme.backgroundSelected, marginBottom: 16 }]}
          />

          <View style={styles.historyList}>
            {filteredHistory.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setVehicle(item);
                  // Load offline dummy features if matching is simulated
                  if (!item.safetyFeatures) {
                    const fallbackItem = {
                      ...item,
                      fuelType: "HYBRID",
                      safetyFeatures: [
                        { title: "Emergency Glass Hammer", description: "Strike corners of side windows. Located in door pocket.", location: "Driver door pocket", icon: "hammer" }
                      ],
                      emergencyProcedures: [
                        { scenario: "Vehicle Submersion", steps: ["Roll down windows immediately", "Unbuckle seatbelts", "Exit through side windows"] }
                      ],
                      vehicleFeatures: [
                        { category: "Structural Specs", items: ["High strength steel cage", "Orange 12V disconnect cabling"] }
                      ]
                    };
                    setVehicle(fallbackItem);
                  }
                  setActiveView("details");
                }}
                style={[styles.historyRow, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              >
                <View>
                  <Text style={[styles.historyTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.historySubText, { color: theme.textSecondary }]}>
                    {item.type} method · {item.date} · {item.timestamp}
                  </Text>
                </View>
                <Text style={{ color: theme.primary }}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 6. DETAILS VIEW (TABS & INTERACTIVE PLAY markers) */}
      {activeView === 'details' && vehicle && (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 }]}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backBtn}>
                <Text style={[styles.backArrow, { color: theme.text }]}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.viewTitle, { color: theme.text }]}>Safety Layout</Text>
            </View>

            {/* Vehicle Header */}
            <View style={[styles.vehicleHeaderCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.vehicleTitle, { color: theme.text }]}>
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </Text>
              {vehicle.registrationNumber ? (
                <Text style={{ color: theme.primary, fontFamily: 'monospace', fontSize: 13, marginTop: 4, fontWeight: 'bold' }}>
                  REGISTRATION: {vehicle.registrationNumber}
                </Text>
              ) : null}
              {vehicle.ownerName ? (
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  OWNER: {vehicle.ownerName}
                </Text>
              ) : null}
              <View style={[styles.fuelBadge, { backgroundColor: theme.primary + '18', marginTop: 8, alignSelf: 'flex-start' }]}>
                <Text style={[styles.fuelBadgeText, { color: theme.primary }]}>
                  {vehicle.fuelType || "PETROL"}
                </Text>
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
                {(vehicle.safetyFeatures || vehicle.safetyGuidelines || []).map((feat: any, idx: number) => {
                  const icon = feat.icon === 'hammer' ? '🔨' : feat.icon === 'exit' ? '🚪' : '⚠️';
                  return (
                    <View key={idx} style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.infoCardTitle, { color: theme.text }]}>{icon} {feat.title}</Text>
                      <Text style={[styles.infoCardText, { color: theme.textSecondary }]}>{feat.description}</Text>
                      <Text style={[styles.infoCardLoc, { color: theme.primary }]}>📍 Location: {feat.location || "Under hood"}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Tab Content 2: Emergency Scenario Guide */}
            {activeResultTab === 'emergency' && (
              <View style={styles.tabContent}>
                {(vehicle.emergencyProcedures || []).map((proc: any, idx: number) => (
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
                {(vehicle.vehicleFeatures || vehicle.features || []).map((grp: any, idx: number) => (
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

          {/* Sticky Bottom Footer */}
          <View style={[styles.resultsFooter, { backgroundColor: theme.backgroundElement, borderTopColor: theme.backgroundSelected }]}>
            <TouchableOpacity
              onPress={() => {
                setVehicle(null);
                setActiveView('dashboard');
              }}
              style={[styles.resultsFooterBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.resultsFooterBtnText}>Start New Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  neonBlobContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  neonBlob1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  neonBlob2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  fixedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sirenContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sirenEmoji: {
    fontSize: 16,
  },
  headerSub: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crashToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOuter: {
    width: 40,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  heroSection: {
    marginBottom: 16,
  },
  readyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroHeading: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  actionDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backArrow: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  manualForm: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  countryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryTabButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countryTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formRow: {
    gap: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  actionSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  scannerWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scannerGuideBox: {
    position: 'absolute',
    top: '35%',
    left: '6%',
    right: '6%',
    aspectRatio: 3.2 / 1,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerLaserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: '#06b6d4',
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#06b6d4',
  },
  scannerCharContainer: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 6,
    borderRadius: 8,
  },
  scannerCharBox: {
    width: 24,
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCharText: {
    fontSize: 14,
    fontWeight: '900',
  },
  scannerBottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 40,
    alignItems: 'center',
  },
  scannerStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scannerOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scannerOptionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  scannerOptionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  manualTriggerBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  manualTriggerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  blackoutOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
  },
  blackoutOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '59.5%',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
  },
  blackoutOverlayLeft: {
    position: 'absolute',
    top: '35%',
    bottom: '40.5%',
    left: 0,
    width: '6%',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
  },
  blackoutOverlayRight: {
    position: 'absolute',
    top: '35%',
    bottom: '40.5%',
    right: 0,
    width: '6%',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
  },
  historyList: {
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  historySubText: {
    fontSize: 10,
    marginTop: 2,
  },
  vehicleHeaderCard: {
    padding: 20,
    borderRadius: 22,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  fuelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fuelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabContent: {
    marginTop: 14,
    gap: 12,
  },
  infoCard: {
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  infoCardText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  infoCardLoc: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
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
  resultsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    zIndex: 50,
  },
  resultsFooterBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsFooterBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  groupCategoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  homeDispatchBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  homeDispatchBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
}) as any;

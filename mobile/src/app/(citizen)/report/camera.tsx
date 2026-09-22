import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { BoundingBoxOverlay } from '@/components/BoundingBoxOverlay';
import { getMockFrameDetection } from '@/lib/detectionPolling';
import { useAppStore } from '@/lib/store';
import { BoundingBox, DefectCategory } from '@/types/report';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Road sample backdrops for simulator / web fallback when native camera hardware isn't attached
const SIMULATION_BACKDROPS: Record<DefectCategory, string> = {
  pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1080&q=80',
  road_crack: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1080&q=80',
  water_pipeline_damage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1080&q=80',
  streetlight_fault: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1080&q=80',
};

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const {
    currentBoxes,
    setCurrentBoxes,
    isDetecting,
    setIsDetecting,
    activeCameraFacing,
    toggleCameraFacing,
    torchOn,
    toggleTorch,
    setDraftPhoto,
  } = useAppStore();

  const [simulatedCategory, setSimulatedCategory] = useState<DefectCategory>('pothole');
  const [inferenceMs, setInferenceMs] = useState<number>(210);
  const [isCapturing, setIsCapturing] = useState(false);

  // Periodic frame sampling loop (TRD §3.4: ~700ms–1s interval)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let isActive = true;

    const sampleFrame = async () => {
      if (!isDetecting) return;

      try {
        // [STUBBED FOR MILESTONE 1]: Query mock detection matching TRD §4.1
        const result = await getMockFrameDetection(simulatedCategory);
        if (isActive) {
          setCurrentBoxes(result.boxes);
          setInferenceMs(result.inference_ms);
        }
      } catch (err) {
        console.warn('Detection frame sampling error:', err);
      }
    };

    // Run initial frame detection
    sampleFrame();

    // Start 850ms interval loop
    timer = setInterval(sampleFrame, 850);

    return () => {
      isActive = false;
      if (timer) clearInterval(timer);
    };
  }, [isDetecting, simulatedCategory]);

  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    // Pause live detection loop per TRD §3.4 step 6
    setIsDetecting(false);

    try {
      let photoUri = SIMULATION_BACKDROPS[simulatedCategory];

      // If on native device with camera permission, capture real frame
      if (cameraRef.current && permission?.granted && Platform.OS !== 'web') {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.9,
            skipProcessing: false,
          });
          if (photo?.uri) {
            photoUri = photo.uri;
          }
        } catch (e) {
          console.warn('Camera takePictureAsync fallback:', e);
        }
      }

      // Lock the primary detection box to the draft
      const primaryBox: BoundingBox | null =
        currentBoxes.length > 0 ? currentBoxes[0] : null;

      setDraftPhoto(photoUri, primaryBox);

      // Navigate to confirmation & complaint filing screen
      router.push('/(citizen)/report/confirm' as any);
    } finally {
      setIsCapturing(false);
    }
  };

  const primaryDetection = currentBoxes.length > 0 ? currentBoxes[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Live Camera View or Simulator Backdrop */}
      {permission?.granted && Platform.OS !== 'web' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={activeCameraFacing}
          enableTorch={torchOn}
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: SIMULATION_BACKDROPS[simulatedCategory] }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.simulatedOverlayDarkener} />
        </View>
      )}

      {/* SVG Bounding Box Overlay rendered over preview */}
      <BoundingBoxOverlay
        boxes={currentBoxes}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
      />

      {/* Camera UI Controls Overlay */}
      <SafeAreaView style={styles.controlsSafeArea}>
        {/* Top Controls Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleIconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Real-time Defect Status HUD */}
          <View style={styles.hudBadge}>
            <View style={styles.pulseGreen} />
            <Text style={styles.hudText}>
              {primaryDetection
                ? `${primaryDetection.class.replace('_', ' ').toUpperCase()} (${Math.round(
                    primaryDetection.confidence * 100
                  )}%)`
                : 'SCANNING NAGPUR ROADS...'}
            </Text>
            <Text style={styles.latencyText}>{inferenceMs}ms</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={[styles.circleIconButton, torchOn && styles.circleIconActive]}
              onPress={toggleTorch}
            >
              <Ionicons
                name={torchOn ? 'flash' : 'flash-off'}
                size={20}
                color={torchOn ? '#EA580C' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Simulator Selector (allows testing all 4 TRD defect classes in Milestone 1) */}
        <View style={styles.categorySelectorContainer}>
          <Text style={styles.selectorHint}>DEFECT RADAR CLASS (TESTING):</Text>
          <View style={styles.categoryPillsRow}>
            {(
              [
                { id: 'pothole', label: 'Pothole' },
                { id: 'road_crack', label: 'Crack' },
                { id: 'water_pipeline_damage', label: 'Water Leak' },
                { id: 'streetlight_fault', label: 'Streetlight' },
              ] as const
            ).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  simulatedCategory === cat.id && styles.categoryPillActive,
                ]}
                onPress={() => setSimulatedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    simulatedCategory === cat.id && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reticle Viewfinder Target in Center */}
        <View style={styles.viewfinderCenter} pointerEvents="none">
          <View style={[styles.cornerBracket, styles.topLeft]} />
          <View style={[styles.cornerBracket, styles.topRight]} />
          <View style={[styles.cornerBracket, styles.bottomLeft]} />
          <View style={[styles.cornerBracket, styles.bottomRight]} />
        </View>

        {/* Bottom Shutter Capture Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.shutterPrompt}>
            {primaryDetection
              ? 'Defect detected! Tap shutter to lock & file complaint.'
              : 'Aim camera at road surface defect or civic hazard.'}
          </Text>

          <View style={styles.shutterRow}>
            <View style={{ width: 50 }} />

            {/* Shutter Button */}
            <TouchableOpacity
              style={styles.shutterOuterRing}
              onPress={handleCapture}
              activeOpacity={0.7}
              disabled={isCapturing}
            >
              <View
                style={[
                  styles.shutterInnerCircle,
                  isCapturing && styles.shutterCapturing,
                ]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => requestPermission()}
            >
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  simulatedOverlayDarkener: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  controlsSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 30,
  },
  circleIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  circleIconActive: {
    backgroundColor: '#FFFFFF',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  pulseGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  latencyText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  categorySelectorContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 30,
    marginTop: 8,
  },
  selectorHint: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 4,
    borderRadius: 20,
    gap: 4,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  categoryPillActive: {
    backgroundColor: '#EA580C',
  },
  categoryPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  viewfinderCenter: {
    position: 'absolute',
    top: '32%',
    left: '15%',
    width: '70%',
    height: '34%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 20,
    zIndex: 30,
  },
  shutterPrompt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shutterRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shutterOuterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  shutterInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EA580C',
  },
  shutterCapturing: {
    transform: [{ scale: 0.85 }],
    backgroundColor: '#DC2626',
  },
  permissionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

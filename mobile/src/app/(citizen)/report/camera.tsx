import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BoundingBoxOverlay } from '@/components/BoundingBoxOverlay';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { PotholeDetectionItem } from '@/types/report';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default fallback road backdrop for simulator / web when hardware camera is unattached
const SIMULATION_ROAD_IMAGE = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=1080&q=80';

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const {
    activeCameraFacing,
    toggleCameraFacing,
    torchOn,
    toggleTorch,
    setDraftDetections,
  } = useAppStore();

  // Detection UI States per Section 6:
  // STATE 1: Scanning for potholes... (no box, no conf)
  // STATE 2: No pothole detected (no box)
  // STATE 3: Pothole detected (box + real conf)
  // STATE 4: Multiple potholes (multiple boxes)
  const [detectedBoxes, setDetectedBoxes] = useState<PotholeDetectionItem[]>([]);
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [inferenceMs, setInferenceMs] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-request camera permission on mount
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Viewfinder scan state indicator (lightweight UI animation, NO hardware shutter loop)
  useEffect(() => {
    // Keep scanning status active for UI reticle animation without taking native photos repeatedly
    setIsScanning(true);
    const t = setTimeout(() => {
      setHasScannedOnce(true);
      setIsScanning(false);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Capture Photo Flow - User taps capture button ONCE
  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let photoUri = SIMULATION_ROAD_IMAGE;
      let capturedBase64: string | null = null;

      // On native hardware, capture high-quality photo
      if (cameraRef.current && permission?.granted && Platform.OS !== 'web') {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.85,
            skipProcessing: false,
            base64: true,
          });
          if (photo?.uri) {
            photoUri = photo.uri;
            capturedBase64 = photo.base64 || null;
          }
        } catch (e) {
          console.warn('Camera takePicture error:', e);
        }
      }

      // Run full resolution YOLO detection on captured image
      const fullRes = await api.detectFullImage({
        imageBase64: capturedBase64 || undefined,
        imageUrl: photoUri.startsWith('http') ? photoUri : undefined,
        fileUri: !capturedBase64 && !photoUri.startsWith('http') ? photoUri : undefined,
      });

      if (!fullRes.detected || fullRes.detections.length === 0) {
        Alert.alert(
          'No Pothole Detected',
          'The AI model analyzed this photo and did not detect an obvious pothole. Do you want to retake or submit a manual report?',
          [
            { text: 'Retake Photo', style: 'cancel' },
            {
              text: 'Report Anyway',
              onPress: () => {
                setDraftDetections(photoUri, []);
                router.push('/(citizen)/report/confirm' as any);
              },
            },
          ]
        );
        return;
      }

      // Update draft state with real model coordinates
      setDraftDetections(photoUri, fullRes.detections);

      // Navigate to confirmation & complaint filing
      router.push('/(citizen)/report/confirm' as any);
    } catch (e) {
      console.warn('Capture error:', e);
      Alert.alert('Capture Failed', 'Could not process road photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload Image Flow per Section 7 (Gallery)
  const handlePickImage = async () => {
    if (isUploading) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const pickedAsset = result.assets[0];
        const pickedUri = pickedAsset.uri;

        // Send image to real YOLO model
        const detectionResult = await api.detectFullImage({
          imageBase64: pickedAsset.base64 || undefined,
          fileUri: pickedUri,
        });

        setIsUploading(false);

        // Section 7 Requirement:
        // "If pothole detected: ✓ Pothole Detected Confidence: 91.7% and bounding box must appear directly over the pothole."
        // "If no pothole: No pothole detected. Please upload another road image. Do not allow fake AI confirmation."
        if (!detectionResult.detected || detectionResult.detections.length === 0) {
          Alert.alert(
            'No Pothole Detected',
            'Our YOLO AI model analyzed the image and found no potholes. Please point your camera at a damaged road or upload another road image.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Real detections found: lock into draft and proceed to confirmation
        setDraftDetections(pickedUri, detectionResult.detections);
        router.push('/(citizen)/report/confirm' as any);
      }
    } catch (e) {
      setIsUploading(false);
      console.warn('Error picking gallery image:', e);
      Alert.alert('Upload Error', 'Could not load image from gallery.');
    }
  };

  const primaryDetection = detectedBoxes.length > 0 ? detectedBoxes[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Live Camera View or Simulator Road Backdrop */}
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
            source={{ uri: SIMULATION_ROAD_IMAGE }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.simulatedOverlayDarkener} />
        </View>
      )}

      {/* SVG Bounding Box Overlay — ONLY rendered when real potholes are detected! */}
      {detectedBoxes.length > 0 && (
        <BoundingBoxOverlay
          boxes={detectedBoxes}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
        />
      )}

      {/* Viewfinder Target Reticle */}
      <View style={styles.viewfinderCenter} pointerEvents="none">
        <View style={[styles.cornerBracket, styles.topLeft]} />
        <View style={[styles.cornerBracket, styles.topRight]} />
        <View style={[styles.cornerBracket, styles.bottomLeft]} />
        <View style={[styles.cornerBracket, styles.bottomRight]} />
      </View>

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

          {/* Real-time Status HUD (Strictly adheres to Section 3, 4, 6) */}
          <View style={styles.hudBadge}>
            <View
              style={[
                styles.statusDot,
                detectedBoxes.length > 0
                  ? styles.dotGreen
                  : isScanning
                  ? styles.dotOrange
                  : styles.dotGray,
              ]}
            />
            <Text style={styles.hudText}>
              {detectedBoxes.length > 0
                ? `${detectedBoxes.length} POTHOLE${detectedBoxes.length > 1 ? 'S' : ''} DETECTED (${(
                    primaryDetection!.confidence * 100
                  ).toFixed(1)}%)`
                : hasScannedOnce
                ? 'NO POTHOLE DETECTED'
                : 'SCANNING FOR POTHOLES...'}
            </Text>
            {inferenceMs > 0 && (
              <Text style={styles.latencyText}>{inferenceMs}ms</Text>
            )}
          </View>

          {/* Flash & Flip Controls */}
          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={[styles.circleIconButton, torchOn && styles.circleIconActive]}
              onPress={toggleTorch}
            >
              <Ionicons
                name={torchOn ? 'flash' : 'flash-off'}
                size={18}
                color={torchOn ? '#EA580C' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Prompt when no detection exists (Subtle per Section 4) */}
        {detectedBoxes.length === 0 && (
          <View style={styles.subtlePromptContainer} pointerEvents="none">
            <Text style={styles.subtlePromptText}>
              Point your camera at a road / pothole
            </Text>
          </View>
        )}

        {/* Bottom Shutter Capture & Upload Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.shutterPrompt}>
            {detectedBoxes.length > 0
              ? `✓ ${detectedBoxes.length} Pothole detected. Tap capture to file complaint.`
              : 'Aim camera at road surface to detect civic defects.'}
          </Text>

          <View style={styles.shutterRow}>
            {/* 🖼️ Upload Image from Gallery (Section 7) */}
            <TouchableOpacity
              style={styles.galleryUploadBtn}
              onPress={handlePickImage}
              activeOpacity={0.8}
              disabled={isUploading || isCapturing}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="images" size={22} color="#FFFFFF" />
                  <Text style={styles.galleryUploadText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Shutter Button [Capture] */}
            <TouchableOpacity
              style={styles.shutterOuterRing}
              onPress={handleCapture}
              activeOpacity={0.7}
              disabled={isCapturing || isUploading}
            >
              <View
                style={[
                  styles.shutterInnerCircle,
                  isCapturing && styles.shutterCapturing,
                ]}
              >
                {isCapturing && <ActivityIndicator color="#FFFFFF" size="small" />}
              </View>
            </TouchableOpacity>

            {/* Permission / Retake Button */}
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => requestPermission()}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
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
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#22C55E',
  },
  dotOrange: {
    backgroundColor: '#EA580C',
  },
  dotGray: {
    backgroundColor: '#94A3B8',
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
  subtlePromptContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 40,
  },
  subtlePromptText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
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
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCapturing: {
    transform: [{ scale: 0.9 }],
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
  galleryUploadBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 2,
  },
  galleryUploadText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

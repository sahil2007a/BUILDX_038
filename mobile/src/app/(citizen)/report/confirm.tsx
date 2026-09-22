import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ALL_DEPARTMENTS, Department, SeverityLevel } from '@/types/report';

const SEVERITY_LEVELS: SeverityLevel[] = ['Low', 'Medium', 'High', 'Critical'];

const NAGPUR_LOCATIONS = [
  { name: 'Kamptee Road, Indora Chowk', lat: 21.1730, lng: 79.1025, ward: 'Ward 3 (Kamptee Road)' },
  { name: 'Katol Road / Gittikhadan (Near School Gate)', lat: 21.1624, lng: 79.0558, ward: 'Ward 2 (Katol Road)' },
  { name: 'West High Court Road, Dharampeth', lat: 21.1352, lng: 79.0621, ward: 'Ward 9 (Dharampeth)' },
  { name: 'Manish Nagar T-Point', lat: 21.1065, lng: 79.0812, ward: 'Ward 14 (Manish Nagar)' },
  { name: 'Laxmi Nagar Square', lat: 21.1215, lng: 79.0732, ward: 'Ward 10 (Laxmi Nagar)' },
  { name: 'Sitabuldi Metro Interchange', lat: 21.1458, lng: 79.0882, ward: 'Ward 8 (Sitabuldi)' },
  { name: 'Medical Square / Ajni', lat: 21.1275, lng: 79.0970, ward: 'Ward 11 (Medical)' },
  { name: 'Wadi Bus Stop Junction', lat: 21.1500, lng: 79.0100, ward: 'Ward 16 (Wadi)' },
];

export default function ConfirmComplaintScreen() {
  const router = useRouter();
  const {
    draft,
    setDraftDepartment,
    setDraftDescription,
    setDraftLocation,
    setDraftSeverity,
    currentUser,
    resetDraft,
  } = useAppStore();

  const [description, setDescription] = useState(draft.description);
  const [selectedDept, setSelectedDept] = useState<Department>(draft.department || 'Roads & Infrastructure');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel>(draft.severityLevel || 'High');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Success modal state
  const [submittedComplaint, setSubmittedComplaint] = useState<any | null>(null);

  // OPTION A: Current Location GPS
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission to use GPS coordinates.');
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to address
      let address = 'Nagpur, Maharashtra';
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          const r = reverse[0];
          const parts = [r.name, r.street, r.district || r.subregion, r.city || 'Nagpur'].filter(Boolean);
          address = parts.join(', ');
        }
      } catch (e) {
        address = `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Nagpur`;
      }

      setDraftLocation({
        latitude,
        longitude,
        address,
        source: 'gps',
      });

      Alert.alert('GPS Location Acquired', address);
    } catch (e) {
      console.warn('Location error:', e);
      Alert.alert('Location Error', 'Could not retrieve GPS coordinates. You can choose location manually.');
    } finally {
      setIsLocating(false);
    }
  };

  // Submit Complaint
  const handleSubmit = async () => {
    if (!draft.photoUri) {
      Alert.alert('Photo Missing', 'Please capture or upload a road defect photo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createComplaint({
        department: selectedDept,
        issue_type: 'Pothole',
        image_url: draft.photoUri,
        ai_confidence: draft.confidence > 0 ? draft.confidence : undefined,
        bounding_boxes: draft.detections.length > 0 ? draft.detections.map((d) => d.bbox) : undefined,
        latitude: draft.location.latitude,
        longitude: draft.location.longitude,
        address: draft.location.address || 'Kamptee Road, Nagpur',
        location_source: draft.location.source || 'gps',
        severity: selectedSeverity,
        description: description.trim() || undefined,
        citizen_name: currentUser?.name || 'Nagpur Citizen',
        citizen_email: currentUser?.email || 'citizen@nagpur.in',
        citizen_phone: currentUser?.phone || '+91 98230 12345',
      });

      setSubmittedComplaint(res);
    } catch (err: any) {
      console.error('Submission error:', err);
      Alert.alert('Submission Failed', 'Could not file complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndNavigate = () => {
    const id = submittedComplaint?.id;
    setSubmittedComplaint(null);
    resetDraft();
    if (id) {
      router.replace(`/(citizen)/report/${id}` as any);
    } else {
      router.replace('/(citizen)' as any);
    }
  };

  const primaryBox = draft.primaryBbox || (draft.detections.length > 0 ? draft.detections[0].bbox : null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & File Complaint</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 8: Detection Result Card */}
          <View style={styles.previewCard}>
            {draft.photoUri ? (
              <Image source={{ uri: draft.photoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderBox}>
                <Ionicons name="image-outline" size={40} color="#94A3B8" />
              </View>
            )}

            {/* Visual Bounding Box directly overlaid on top of photo */}
            {primaryBox && (
              <View
                style={[
                  styles.imageBbox,
                  {
                    left: `${primaryBox.x * 100}%`,
                    top: `${primaryBox.y * 100}%`,
                    width: `${primaryBox.width * 100}%`,
                    height: `${primaryBox.height * 100}%`,
                  },
                ]}
              >
                <View style={styles.imageBboxBadge}>
                  <Text style={styles.imageBboxText}>
                    POTHOLE {draft.confidence > 0 ? `${(draft.confidence * 100).toFixed(1)}%` : ''}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.overlayPillRow}>
              <View style={styles.aiTag}>
                <Ionicons name="scan" size={12} color="#FFFFFF" />
                <Text style={styles.aiTagText}>
                  {draft.detections.length > 0
                    ? `YOLO Verified: ${draft.detections.length} Pothole (${(draft.confidence * 100).toFixed(1)}%)`
                    : 'Pothole Inspection'}
                </Text>
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={() => router.back()}>
                <Ionicons name="refresh" size={12} color="#FFFFFF" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* YOLO Detection Confirmed Banner */}
          <View style={styles.detectionStatusCard}>
            <View style={styles.statusIconCircle}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.statusHeaderRow}>
                <Text style={styles.statusTitle}>Pothole Detection Confirmed</Text>
                {draft.confidence > 0 && (
                  <View style={styles.confBadge}>
                    <Text style={styles.confBadgeText}>
                      {(draft.confidence * 100).toFixed(1)}% YOLO
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statusSub}>
                Coordinates and dimensions locked from trained YOLOv8 model inference.
              </Text>
            </View>
          </View>

          {/* Section 12: Select Department (Required) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>SELECT DEPARTMENT * (REQUIRED)</Text>
            <Text style={styles.sectionHint}>
              Complaint will route directly to responsible municipal officers and engineers.
            </Text>
            <View style={styles.departmentList}>
              {ALL_DEPARTMENTS.map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.deptCard, isSelected && styles.deptCardSelected]}
                    onPress={() => {
                      setSelectedDept(dept);
                      setDraftDepartment(dept);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deptRadioCircle}>
                      {isSelected && <View style={styles.deptRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deptName, isSelected && styles.deptNameSelected]}>
                        {dept}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="shield-checkmark" size={18} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 17-20: Location System (Fix Completely) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>DEFECT GEOLOCATION (NAGPUR)</Text>

            {/* Map Preview Card */}
            <View style={styles.locationDisplayCard}>
              <View style={styles.mapIconCircle}>
                <Ionicons name="location-sharp" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationAddressText} numberOfLines={2}>
                  {draft.location.address || 'Kamptee Road, Indora Chowk, Nagpur'}
                </Text>
                <Text style={styles.locationCoordsText}>
                  Latitude: {draft.location.latitude.toFixed(6)} • Longitude: {draft.location.longitude.toFixed(6)}
                </Text>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>
                    Source: {draft.location.source === 'gps' ? '🛰️ Real GPS' : '📍 Manual Selection'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Location Action Buttons */}
            <View style={styles.locationActionsRow}>
              {/* Option A: Use Current Location */}
              <TouchableOpacity
                style={styles.locActionBtn}
                onPress={handleUseCurrentLocation}
                disabled={isLocating}
                activeOpacity={0.85}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <>
                    <Ionicons name="locate" size={16} color="#0284C7" />
                    <Text style={styles.locActionBtnText}>Use My Current Location</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Option B: Choose Location Manually */}
              <TouchableOpacity
                style={[styles.locActionBtn, styles.locActionBtnSecondary]}
                onPress={() => setShowLocationModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="map-outline" size={16} color="#EA580C" />
                <Text style={[styles.locActionBtnText, { color: '#EA580C' }]}>
                  Choose Manually
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Severity Selector */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>RISK & SEVERITY LEVEL</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map((level) => {
                const isSelected = selectedSeverity === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.severityPill, isSelected && styles.severityPillActive]}
                    onPress={() => {
                      setSelectedSeverity(level);
                      setDraftSeverity(level);
                    }}
                  >
                    <Text style={[styles.severityPillText, isSelected && styles.severityPillTextActive]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description Textarea */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>ADDITIONAL CONTEXT (OPTIONAL)</Text>
            <TextInput
              style={styles.descInput}
              placeholder="Describe the defect, proximity to landmarks, schools, or hospitals..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                setDraftDescription(text);
              }}
            />
          </View>
        </ScrollView>

        {/* Bottom Submission Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Complaint to {selectedDept}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Manual Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.locationModalSheet}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Choose Nagpur Location</Text>
                <Text style={styles.modalSub}>
                  Select damaged road corridor to route to the correct ward engineer
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowLocationModal(false)}
              >
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={NAGPUR_LOCATIONS}
              keyExtractor={(item) => item.name}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locItem}
                  onPress={() => {
                    setDraftLocation({
                      latitude: item.lat,
                      longitude: item.lng,
                      address: `${item.name} (${item.ward})`,
                      source: 'manual',
                    });
                    setShowLocationModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.locItemIconCircle}>
                    <Ionicons name="location-sharp" size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locItemName}>{item.name}</Text>
                    <Text style={styles.locItemWard}>{item.ward}</Text>
                    <Text style={styles.locItemCoords}>
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Section 22: Complaint Success Modal */}
      <Modal
        visible={!!submittedComplaint}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-sharp" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>✓ Complaint Submitted</Text>
            <Text style={styles.successSub}>
              Routed to {submittedComplaint?.department_name} department.
            </Text>

            <View style={styles.successInfoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Complaint ID:</Text>
                <Text style={styles.infoValueBold}>{submittedComplaint?.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoValue}>{submittedComplaint?.department_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {submittedComplaint?.address}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{submittedComplaint?.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.emailAlertNotice}>
              <Ionicons name="mail" size={14} color="#0369A1" />
              <Text style={styles.emailAlertNoticeText}>
                Officer email alert dispatched to sahilramteke95@gmail.com
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewComplaintBtn}
              onPress={handleFinishAndNavigate}
              activeOpacity={0.85}
            >
              <Text style={styles.viewComplaintBtnText}>View Complaint</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#0F172A',
    marginBottom: 14,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBbox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    zIndex: 10,
  },
  imageBboxBadge: {
    position: 'absolute',
    top: -24,
    left: 0,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageBboxText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  overlayPillRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 15,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  aiTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  detectionStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  confBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  statusSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15,
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  departmentList: {
    gap: 6,
  },
  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  deptCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  deptRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  deptName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  deptNameSelected: {
    color: '#C2410C',
  },
  locationDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 8,
  },
  mapIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationAddressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#64748B',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  locActionBtnSecondary: {
    backgroundColor: '#FFF7ED',
  },
  locActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  severityPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  severityPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  severityPillTextActive: {
    color: '#FFFFFF',
  },
  descInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  locationModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  locItemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  locItemWard: {
    fontSize: 11,
    color: '#64748B',
  },
  locItemCoords: {
    fontSize: 10,
    color: '#94A3B8',
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  successInfoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  emailAlertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 18,
    width: '100%',
  },
  emailAlertNoticeText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  viewComplaintBtn: {
    width: '100%',
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  viewComplaintBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

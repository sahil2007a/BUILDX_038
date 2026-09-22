import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import { DuplicateConfirmSheet } from '@/components/DuplicateConfirmSheet';
import { SeverityBadge } from '@/components/SeverityBadge';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { DefectCategory, DuplicateCandidate } from '@/types/report';

const CATEGORIES: Array<{
  id: DefectCategory;
  label: string;
  agency: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'pothole',
    label: 'Pothole',
    agency: 'NMC Road Maintenance',
    icon: 'warning',
  },
  {
    id: 'road_crack',
    label: 'Road Crack',
    agency: 'NMC Road Maintenance',
    icon: 'git-commit-outline',
  },
  {
    id: 'water_pipeline_damage',
    label: 'Water Leak',
    agency: 'Nagpur Water Works (OCW)',
    icon: 'water',
  },
  {
    id: 'streetlight_fault',
    label: 'Streetlight',
    agency: 'MSEDCL / NMC Electrical',
    icon: 'bulb',
  },
];

export default function ConfirmComplaintScreen() {
  const router = useRouter();
  const { draft, setDraftCategory, setDraftDescription, resetDraft } = useAppStore();

  const [description, setDescription] = useState(draft.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate Check Modal State
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const selectedCategoryConfig =
    CATEGORIES.find((c) => c.id === draft.category) || CATEGORIES[0];

  const handleSubmit = async () => {
    if (!draft.photoUri) {
      Alert.alert('Photo Missing', 'Please take a defect photo first.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Submit to API (TRD §4.2 POST /reports)
      const res = await api.createReport({
        category: draft.category,
        photo_url: draft.photoUri,
        bbox: draft.bbox ?? undefined,
        confidence: draft.confidence,
        lat: draft.location.latitude,
        lng: draft.location.longitude,
        description: description.trim() || undefined,
        severity_score: draft.severityScore,
      });

      // Step 2: Check if duplicate candidates were returned (PRD §5.1 step 5)
      if (res.duplicate_candidates && res.duplicate_candidates.length > 0) {
        setDuplicateCandidate(res.duplicate_candidates[0]);
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        return;
      }

      // If no duplicate, proceed to ticket timeline
      resetDraft();
      router.replace(`/(citizen)/report/${res.report_id}` as any);
    } catch (err) {
      console.error('Submission error:', err);
      Alert.alert('Submission Failed', 'Could not file complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmExistingDuplicate = async (reportId: string) => {
    setShowDuplicateModal(false);
    try {
      await api.confirmDuplicate(reportId);
      resetDraft();
      router.replace(`/(citizen)/report/${reportId}` as any);
    } catch (err) {
      console.warn('Confirm duplicate error:', err);
      router.replace(`/(citizen)/report/${reportId}` as any);
    }
  };

  const handleProceedAsNewTicket = () => {
    setShowDuplicateModal(false);
    // Proceed with creating new ticket
    const newId = `rpt_${Math.random().toString(36).substring(2, 7)}`;
    resetDraft();
    router.replace(`/(citizen)/report/${newId}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top App Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & File Complaint</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Captured Defect Preview Card */}
          <View style={styles.previewCard}>
            {draft.photoUri && (
              <Image source={{ uri: draft.photoUri }} style={styles.previewImage} />
            )}

            <View style={styles.overlayPillRow}>
              <View style={styles.aiTag}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.aiTagText}>
                  AI Locked: {selectedCategoryConfig.label} ({Math.round(draft.confidence * 100)}%)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => router.back()}
              >
                <Ionicons name="refresh" size={12} color="#FFFFFF" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Severity & Risk Evaluation Box */}
          <View style={styles.severityCard}>
            <View style={styles.severityHeaderRow}>
              <View>
                <Text style={styles.sectionLabel}>PRIORITY SCORE (TRD §6.3)</Text>
                <Text style={styles.severityTitle}>Risk & Severity Level</Text>
              </View>
              <SeverityBadge score={draft.severityScore} size="md" />
            </View>

            <Text style={styles.severityExplanation}>
              Computed from defect bounding area, road hierarchy (Arterial), and proximity to schools/hospitals in Nagpur.
            </Text>

            <View style={styles.slaBanner}>
              <Ionicons name="shield" size={16} color="#DC2626" />
              <Text style={styles.slaBannerText}>
                Subject to 2019 Bombay HC Nagpur Bench 10-Day SLA
              </Text>
            </View>
          </View>

          {/* Category Correction Selector */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>DEFECT CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = draft.category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() => setDraftCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={20}
                      color={isSelected ? '#EA580C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.categoryCardLabel,
                        isSelected && styles.categoryCardLabelSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                    <Text
                      style={[
                        styles.categoryAgencyText,
                        isSelected && styles.categoryAgencyTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.agency}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Details Card */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>GEOLOCATION (NAGPUR GPS)</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationIconCircle}>
                <Ionicons name="navigate-circle" size={24} color="#0284C7" />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationAddress}>
                  {draft.location.address || 'Kamptee Road, Indora Chowk, Nagpur'}
                </Text>
                <Text style={styles.coordinatesText}>
                  Lat: {draft.location.latitude.toFixed(4)}, Lng: {draft.location.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          {/* Optional Description Input */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>ADDITIONAL CONTEXT (OPTIONAL)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="e.g. Deep pothole near school gate, two-wheelers skidding after rain"
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

        {/* Bottom Submission Action */}
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
                <Text style={styles.submitButtonText}>Submit Complaint to NMC</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Duplicate Confirmation Sheet Modal */}
      <DuplicateConfirmSheet
        visible={showDuplicateModal}
        candidate={duplicateCandidate}
        onConfirmExisting={handleConfirmExistingDuplicate}
        onProceedAsNew={handleProceedAsNewTicket}
        onCancel={() => setShowDuplicateModal(false)}
      />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  previewCard: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#0F172A',
    marginBottom: 16,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayPillRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  aiTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.9)',
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
  severityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  severityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  severityExplanation: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  slaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  slaBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  categoryCardSelected: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  categoryCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  categoryCardLabelSelected: {
    color: '#EA580C',
  },
  categoryAgencyText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  categoryAgencyTextSelected: {
    color: '#C2410C',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  locationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  coordinatesText: {
    fontSize: 11,
    color: '#64748B',
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
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
    paddingVertical: 15,
    borderRadius: 14,
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
});

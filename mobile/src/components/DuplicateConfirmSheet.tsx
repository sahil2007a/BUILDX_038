import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DuplicateCandidate } from '@/types/report';

interface Props {
  visible: boolean;
  candidate: DuplicateCandidate | null;
  onConfirmExisting: (reportId: string) => void;
  onProceedAsNew: () => void;
  onCancel: () => void;
}

export const DuplicateConfirmSheet: React.FC<Props> = ({
  visible,
  candidate,
  onConfirmExisting,
  onProceedAsNew,
  onCancel,
}) => {
  if (!candidate) return null;

  const visualPercent = Math.round(candidate.visual_similarity * 100);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header Indicator */}
          <View style={styles.dragHandle} />

          {/* Title and Icon */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="git-merge-outline" size={24} color="#EA580C" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Existing Report Found</Text>
              <Text style={styles.subtitle}>
                Nagpur Single Source of Truth Engine
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.description}>
            A defect matching this issue was already filed nearby. Confirming it
            boosts the queue priority and SLA urgency instead of creating a
            duplicate ticket.
          </Text>

          {/* Candidate Card */}
          <View style={styles.candidateCard}>
            {candidate.photo_url ? (
              <Image
                source={{ uri: candidate.photo_url }}
                style={styles.candidateImage}
              />
            ) : (
              <View style={[styles.candidateImage, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={28} color="#94A3B8" />
              </View>
            )}

            <View style={styles.candidateDetails}>
              <Text style={styles.ticketId}>Ticket #{candidate.report_id}</Text>
              <Text style={styles.candidateWard}>
                {candidate.ward || 'Dharampeth / Ward 9'}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricBadge}>
                  <Ionicons name="location-sharp" size={12} color="#0284C7" />
                  <Text style={styles.metricText}>
                    {Math.round(candidate.distance_m)}m away
                  </Text>
                </View>

                <View style={[styles.metricBadge, styles.similarityBadge]}>
                  <Ionicons name="scan-outline" size={12} color="#16A34A" />
                  <Text style={[styles.metricText, styles.similarityText]}>
                    {visualPercent}% Visual Match
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionColumn}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => onConfirmExisting(candidate.report_id)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>
                Yes, This is the Same Defect (+1 Corroborate)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onProceedAsNew}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                No, This is a Different Defect (Create New Ticket)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel & Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 16,
  },
  candidateCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 20,
  },
  candidateImage: {
    width: 76,
    height: 76,
    borderRadius: 10,
  },
  placeholderImage: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  candidateWard: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  similarityBadge: {
    backgroundColor: '#DCFCE7',
  },
  metricText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  similarityText: {
    color: '#15803D',
  },
  actionColumn: {
    gap: 10,
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 13,
  },
});

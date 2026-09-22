import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Complaint, ComplaintStatus } from '@/types/report';

const STATUS_STEPS: Array<{ key: ComplaintStatus; label: string; desc: string }> = [
  { key: 'Submitted', label: 'Submitted', desc: 'Complaint received & registered in NMC DB' },
  { key: 'Under Review', label: 'Under Review', desc: 'AI verified & checked by ward triage team' },
  { key: 'Assigned', label: 'Assigned', desc: 'Assigned to field repair engineer & contractor' },
  { key: 'In Progress', label: 'In Progress', desc: 'Active road patch / utility repair on site' },
  { key: 'Resolved', label: 'Resolved', desc: 'Repair completed & verified' },
];

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (id) {
          const data = await api.getComplaintDetail(id);
          setComplaint(data);
        }
      } catch (err) {
        try {
          const list = await api.getComplaints();
          const found = list.find((c) => c.id === id);
          if (found) setComplaint(found);
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Fetching Nagpur ticket details...</Text>
      </SafeAreaView>
    );
  }

  if (!complaint) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Ticket #{id} not found.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(citizen)' as any)}>
          <Text style={styles.backHomeText}>Return to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Normalize status key for stepper
  let activeIndex = STATUS_STEPS.findIndex(
    (s) => s.key.toLowerCase() === complaint.status.toLowerCase()
  );
  if (activeIndex < 0) activeIndex = 0;

  const primaryBox =
    complaint.bounding_boxes && complaint.bounding_boxes.length > 0
      ? complaint.bounding_boxes[0]
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(citizen)' as any)}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>COMPLAINT TRACKER</Text>
          <Text style={styles.headerTitle}>{complaint.id}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Container with Bounding Box Overlay */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: complaint.image_url }} style={styles.photo} />

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
                  POTHOLE {complaint.ai_confidence ? `${(complaint.ai_confidence * 100).toFixed(1)}%` : ''}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.photoOverlayBadge}>
            <View style={styles.severityTag}>
              <Text style={styles.severityTagText}>{complaint.severity} Risk</Text>
            </View>
          </View>
        </View>

        {/* Overview Details */}
        <View style={styles.sectionCard}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryTitle}>{complaint.issue_type}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{complaint.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="business" size={14} color="#EA580C" />
            <Text style={styles.deptMetaText}>{complaint.department_name}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-sharp" size={14} color="#64748B" />
            <Text style={styles.metaText}>{complaint.address}</Text>
          </View>

          {complaint.ai_confidence ? (
            <View style={styles.aiVerificationRow}>
              <Ionicons name="scan" size={14} color="#16A34A" />
              <Text style={styles.aiVerificationText}>
                YOLOv8 AI Verified: {(complaint.ai_confidence * 100).toFixed(1)}% Confidence
              </Text>
            </View>
          ) : null}

          {complaint.description ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Your Note:</Text>
              <Text style={styles.descContent}>"{complaint.description}"</Text>
            </View>
          ) : null}
        </View>

        {/* Section 32: Status Timeline Stepper */}
        <View style={styles.sectionCard}>
          <Text style={styles.timelineHeader}>RESOLUTION LIFECYCLE</Text>

          <View style={styles.timelineList}>
            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.iconColumn}>
                    <View
                      style={[
                        styles.timelineDot,
                        isPast && styles.timelineDotPast,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View
                          style={[
                            styles.innerDot,
                            isCurrent && { backgroundColor: '#EA580C' },
                          ]}
                        />
                      )}
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isPast && styles.timelineLinePast,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineTextColumn}>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCurrent && styles.stepLabelCurrent,
                        isPast && styles.stepLabelPast,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Home Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(citizen)' as any)}
        >
          <Text style={styles.homeButtonText}>Back to Live Feed</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '700',
  },
  backHomeBtn: {
    marginTop: 20,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  photoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    backgroundColor: '#0F172A',
    marginBottom: 14,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  photoOverlayBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  severityTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deptMetaText: {
    fontSize: 13,
    color: '#EA580C',
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  aiVerificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
  },
  aiVerificationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  descLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  descContent: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
  },
  timelineHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  iconColumn: {
    alignItems: 'center',
    width: 22,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotPast: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  timelineDotCurrent: {
    borderColor: '#EA580C',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineLinePast: {
    backgroundColor: '#16A34A',
  },
  timelineTextColumn: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabelCurrent: {
    color: '#0F172A',
  },
  stepLabelPast: {
    color: '#16A34A',
  },
  stepDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  homeButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

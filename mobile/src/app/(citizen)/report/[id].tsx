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
import { SeverityBadge } from '@/components/SeverityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { api } from '@/lib/api';
import { Report, ReportStatus } from '@/types/report';

const STATUS_STEPS: Array<{ key: ReportStatus; label: string; desc: string }> = [
  { key: 'reported', label: 'Reported', desc: 'Complaint received & logged' },
  { key: 'verified', label: 'AI Verified', desc: 'Defect classified & dedup checked' },
  { key: 'assigned', label: 'Assigned', desc: 'Routed to ward field team' },
  { key: 'in_progress', label: 'In Progress', desc: 'Contractor on-site repair' },
  { key: 'resolved', label: 'Resolved', desc: 'AI photo closure verified' },
];

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        if (id) {
          const data = await api.getReport(id);
          setReport(data);
        }
      } catch (err) {
        console.warn('Failed to load report:', err);
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

  if (!report) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Ticket not found.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(citizen)')}>
          <Text style={styles.backHomeText}>Return to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === report.status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(citizen)')}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>TICKET TRACKER</Text>
          <Text style={styles.headerTitle}>#{report.id}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Card */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: report.photo_url }} style={styles.photo} />
          <View style={styles.photoOverlayBadge}>
            <SeverityBadge score={report.severity_score} size="sm" />
          </View>
        </View>

        {/* Overview Details */}
        <View style={styles.sectionCard}>
          <View style={styles.titleRow}>
            <Text style={styles.categoryTitle}>
              {report.category.replace('_', ' ').toUpperCase()}
            </Text>
            {report.sla_deadline && <SLACountdown deadline={report.sla_deadline} />}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-sharp" size={14} color="#64748B" />
            <Text style={styles.metaText}>{report.ward || 'Nagpur Zone'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="business" size={14} color="#64748B" />
            <Text style={styles.metaText}>
              {report.assigned_department || 'NMC Road Maintenance'}
            </Text>
          </View>

          {report.description ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Citizen Note:</Text>
              <Text style={styles.descContent}>{report.description}</Text>
            </View>
          ) : null}

          {report.corroborating_count > 1 && (
            <View style={styles.corroboratingCard}>
              <Ionicons name="people-circle" size={24} color="#EA580C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.corroboratingHeadline}>
                  +{report.corroborating_count} Citizens Corroborated
                </Text>
                <Text style={styles.corroboratingSub}>
                  Multiple reports merged to prevent duplicate tickets and boost NMC repair urgency.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Status Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.timelineHeader}>RESOLUTION TIMELINE</Text>

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
          onPress={() => router.replace('/(citizen)')}
        >
          <Text style={styles.homeButtonText}>Back to Nagpur Live Feed</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  photoContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 220,
    backgroundColor: '#0F172A',
    marginBottom: 16,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  descContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  corroboratingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  corroboratingHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
  },
  corroboratingSub: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 15,
  },
  timelineHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  iconColumn: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
    paddingLeft: 12,
    paddingBottom: 14,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabelCurrent: {
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Complaint, ComplaintStats } from '@/types/report';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  Submitted: { label: 'Submitted', bg: '#EFF6FF', text: '#2563EB' },
  'Under Review': { label: 'Under Review', bg: '#F5F3FF', text: '#7C3AED' },
  Assigned: { label: 'Assigned', bg: '#FEF3C7', text: '#D97706' },
  'In Progress': { label: 'In Progress', bg: '#FFEDD5', text: '#EA580C' },
  Resolved: { label: 'Resolved', bg: '#ECFDF5', text: '#059669' },
};

export default function CitizenHomeScreen() {
  const router = useRouter();
  const { currentUser, setDraftDetections } = useAppStore();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    new_complaints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setErrorMessage(null);
      const [complaintsData, statsData] = await Promise.all([
        api.getComplaints(),
        api.getComplaintStats(),
      ]);
      setComplaints(complaintsData);
      setStats(statsData);
    } catch (e: any) {
      console.warn('Dashboard data fetch error:', e);
      setErrorMessage('Could not connect to RastaRakshak server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleGalleryUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setLoading(true);

        const detectionResult = await api.detectFullImage({
          imageBase64: pickedAsset.base64 || undefined,
          fileUri: pickedAsset.uri,
        });

        setLoading(false);

        if (!detectionResult.detected || detectionResult.detections.length === 0) {
          alert('No pothole detected in this image. Please select a clear road damage photo.');
          return;
        }

        setDraftDetections(pickedAsset.uri, detectionResult.detections);
        router.push('/(citizen)/report/confirm' as any);
      }
    } catch (e) {
      setLoading(false);
      console.warn('Direct upload error:', e);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pothole') return c.issue_type.toLowerCase().includes('pothole');
    if (selectedFilter === 'water') return c.department_name.includes('Water');
    if (selectedFilter === 'streetlight') return c.department_name.includes('Streetlight');
    return true;
  });

  const userName = currentUser?.name || 'Sahil';

  const renderComplaintCard = ({ item }: { item: Complaint }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Submitted;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/(citizen)/report/${item.id}` as any)}
      >
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>

            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>{item.id}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{item.issue_type}</Text>

          <Text style={styles.cardDept}>{item.department_name}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={12} color="#64748B" />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            {item.ai_confidence ? (
              <View style={styles.aiBadge}>
                <Ionicons name="scan" size={10} color="#16A34A" />
                <Text style={styles.aiBadgeText}>
                  AI Conf: {(item.ai_confidence * 100).toFixed(1)}%
                </Text>
              </View>
            ) : null}

            <View style={styles.severityBadge}>
              <Text style={styles.severityText}>{item.severity} Risk</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingSubtitle}>NAGPUR CIVIC RADAR</Text>
          <Text style={styles.greetingTitle}>
            Good Morning, <Text style={{ color: '#EA580C' }}>{userName}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.roleToggle}
          onPress={() => router.push('/auth/login' as any)}
        >
          <Ionicons name="shield-checkmark" size={15} color="#0F172A" />
          <Text style={styles.roleToggleText}>
            {currentUser?.role === 'officer' ? 'Officer Mode' : 'Switch Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        renderItem={renderComplaintCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />
        }
        ListHeaderComponent={
          <>
            {/* Section 44: Action Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.heroBadgeText}>Keep Nagpur safer, one report at a time</Text>
              </View>

              <Text style={styles.heroHeadline}>
                Spot a road problem?
              </Text>
              <Text style={styles.heroSub}>
                AI will detect potholes with real YOLO bounding boxes and help you report them directly to municipal officers.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionButton}
                activeOpacity={0.85}
                onPress={() => router.push('/(citizen)/report/camera' as any)}
              >
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera" size={20} color="#EA580C" />
                </View>
                <Text style={styles.primaryActionText}>Report an Issue (Live Camera) →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionButton, styles.secondaryUploadButton]}
                activeOpacity={0.85}
                onPress={handleGalleryUpload}
              >
                <View style={[styles.cameraIconCircle, { backgroundColor: '#334155' }]}>
                  <Ionicons name="images" size={18} color="#F8FAFC" />
                </View>
                <Text style={styles.primaryActionText}>Upload Image (From Gallery)</Text>
              </TouchableOpacity>
            </View>

            {/* Section 23: Your Reports Counter Summary */}
            <View style={styles.statsCard}>
              <Text style={styles.statsHeaderTitle}>Your Nagpur Reports</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNumber, { color: '#059669' }]}>{stats.resolved}</Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                </View>
              </View>
            </View>

            {/* Section 24: Error State with Retry Button */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadDashboardData}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Complaints</Text>
              <Text style={styles.sectionCount}>
                {filteredComplaints.length} {filteredComplaints.length === 1 ? 'ticket' : 'tickets'}
              </Text>
            </View>

            <View style={styles.filterChipsRow}>
              {[
                { id: 'all', label: 'All Issues' },
                { id: 'pothole', label: 'Potholes' },
                { id: 'water', label: 'Water Supply' },
                { id: 'streetlight', label: 'Streetlights' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, selectedFilter === chip.id && styles.chipActive]}
                  onPress={() => setSelectedFilter(chip.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedFilter === chip.id && styles.chipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={styles.emptySub}>Loading active civic complaints...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No complaints yet.</Text>
              <Text style={styles.emptySub}>
                Found a pothole or road defect? Report it now to keep Nagpur safe!
              </Text>
            </View>
          )
        }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  greetingSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  roleToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  heroBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  heroHeadline: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 16,
  },
  primaryActionButton: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryUploadButton: {
    marginTop: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cameraIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 84,
    height: 94,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  cardDept: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  severityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

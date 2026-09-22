import React, { useEffect, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { DefectCategory, Report, ReportStatus } from '@/types/report';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SLACountdown } from '@/components/SLACountdown';

const CATEGORY_LABELS: Record<DefectCategory, string> = {
  pothole: 'Pothole',
  road_crack: 'Road Crack',
  water_pipeline_damage: 'Water Pipeline',
  streetlight_fault: 'Streetlight',
};

const STATUS_BADGE_CONFIG: Record<
  ReportStatus,
  { label: string; bg: string; text: string }
> = {
  reported: { label: 'Reported', bg: '#EFF6FF', text: '#2563EB' },
  verified: { label: 'AI Verified', bg: '#F5F3FF', text: '#7C3AED' },
  assigned: { label: 'Assigned', bg: '#FEF3C7', text: '#D97706' },
  in_progress: { label: 'In Progress', bg: '#FFEDD5', text: '#EA580C' },
  pending_review: { label: 'Pending Review', bg: '#FFFBEB', text: '#B45309' },
  resolved: { label: 'Resolved', bg: '#ECFDF5', text: '#059669' },
};

export default function CitizenHomeScreen() {
  const router = useRouter();
  const { reports, setReports, userRole, setUserRole } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const loadReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (e) {
      console.warn('Failed to load reports:', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.category === selectedFilter;
  });

  const renderReportCard = ({ item }: { item: Report }) => {
    const statusCfg = STATUS_BADGE_CONFIG[item.status] || STATUS_BADGE_CONFIG.reported;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/(citizen)/report/${item.id}` as any)}
      >
        <Image source={{ uri: item.photo_url }} style={styles.cardImage} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>
            <SeverityBadge score={item.severity_score} size="sm" />
          </View>

          <Text style={styles.cardTitle}>
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color="#64748B" />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.ward || 'Nagpur Zone'}
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            {item.sla_deadline ? (
              <SLACountdown deadline={item.sla_deadline} compact />
            ) : null}

            {item.corroborating_count > 1 && (
              <View style={styles.corroborateBadge}>
                <Ionicons name="people" size={11} color="#EA580C" />
                <Text style={styles.corroborateText}>
                  +{item.corroborating_count} citizens
                </Text>
              </View>
            )}
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
          <Text style={styles.brandSubtitle}>NMC CIVIC DEFECT RADAR</Text>
          <Text style={styles.brandTitle}>
            Rasta<Text style={{ color: '#EA580C' }}>Rakshak</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.roleToggle}
          onPress={() => router.push('/auth/login' as any)}
        >
          <Ionicons name="shield-checkmark" size={16} color="#0F172A" />
          <Text style={styles.roleToggleText}>
            {userRole === 'officer' ? 'Officer Mode' : 'Nagpur'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content List */}
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReportCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />
        }
        ListHeaderComponent={
          <>
            {/* Action Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.heroBadgeText}>Nagpur AI Infrastructure Sentinel</Text>
              </View>

              <Text style={styles.heroHeadline}>
                Spot a defect? Report in 60 seconds with live AI bounding.
              </Text>

              <Text style={styles.heroSub}>
                Complaints auto-deduplicate and route directly to NMC Roads, OCW Water, or MSEDCL under the 10-day High Court repair mandate.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionButton}
                activeOpacity={0.85}
                onPress={() => router.push('/(citizen)/report/camera' as any)}
              >
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera" size={20} color="#EA580C" />
                </View>
                <Text style={styles.primaryActionText}>Report an Issue (Live Camera)</Text>
              </TouchableOpacity>
            </View>

            {/* Monitored Corridors Bar */}
            <View style={styles.corridorBanner}>
              <View style={styles.corridorHeader}>
                <Ionicons name="stats-chart" size={14} color="#0284C7" />
                <Text style={styles.corridorHeaderText}>
                  Priority Corridors: Kamptee Rd • Katol Rd • Dharampeth • Manish Nagar
                </Text>
              </View>
            </View>

            {/* Filter Chips Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Nagpur Issues</Text>
              <Text style={styles.sectionCount}>
                {filteredReports.length} {filteredReports.length === 1 ? 'ticket' : 'tickets'}
              </Text>
            </View>

            <View style={styles.filterChipsRow}>
              {[
                { id: 'all', label: 'All Issues' },
                { id: 'pothole', label: 'Potholes' },
                { id: 'road_crack', label: 'Cracks' },
                { id: 'water_pipeline_damage', label: 'Water Leaks' },
                { id: 'streetlight_fault', label: 'Streetlights' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.chip,
                    selectedFilter === chip.id && styles.chipActive,
                  ]}
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
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No defects found in this category</Text>
            <Text style={styles.emptySub}>
              All reported road segments in this filter have been resolved or are clear.
            </Text>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  roleToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 18,
  },
  primaryActionButton: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cameraIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  corridorBanner: {
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  corridorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  corridorHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
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
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardImage: {
    width: 90,
    height: 100,
    borderRadius: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  cardDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  corroborateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  corroborateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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

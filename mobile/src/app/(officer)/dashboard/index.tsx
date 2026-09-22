import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
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
import { ALL_DEPARTMENTS, Complaint, ComplaintStats, Department } from '@/types/report';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  Submitted: { label: 'New / Submitted', bg: '#EFF6FF', text: '#2563EB' },
  'Under Review': { label: 'Under Review', bg: '#F5F3FF', text: '#7C3AED' },
  Assigned: { label: 'Assigned', bg: '#FEF3C7', text: '#D97706' },
  'In Progress': { label: 'In Progress', bg: '#FFEDD5', text: '#EA580C' },
  Resolved: { label: 'Resolved', bg: '#ECFDF5', text: '#059669' },
};

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { currentUser, setUserRole } = useAppStore();

  const officerDept: Department =
    currentUser?.department_name || 'Roads & Infrastructure';

  const [selectedDept, setSelectedDept] = useState<Department>(officerDept);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  const loadData = async (dept: string) => {
    try {
      const [list, st] = await Promise.all([
        api.getComplaints({ department: dept }),
        api.getComplaintStats(dept),
      ]);
      setComplaints(list);
      setStats(st);
    } catch (e) {
      console.warn('Officer data fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedDept);
  }, [selectedDept]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedDept);
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedStatus === 'all') return true;
    return c.status === selectedStatus;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>OFFICER TRIAGE PORTAL</Text>
          <Text style={styles.headerTitle}>
            Good Morning, <Text style={{ color: '#EA580C' }}>Officer</Text>
          </Text>
          <Text style={styles.headerDept}>{selectedDept}</Text>
        </View>

        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => {
            setUserRole('citizen');
            router.replace('/(citizen)' as any);
          }}
        >
          <Ionicons name="arrow-back" size={14} color="#0F172A" />
          <Text style={styles.switchRoleText}>Citizen Mode</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Department Selector Pills (Defaults to officer's own department) */}
            <View style={styles.deptSection}>
              <Text style={styles.sectionHeading}>DEPARTMENT VIEW:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptScroll}>
                {ALL_DEPARTMENTS.map((dept) => {
                  const isSelected = selectedDept === dept;
                  return (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.deptChip, isSelected && styles.deptChipActive]}
                      onPress={() => setSelectedDept(dept)}
                    >
                      <Text style={[styles.deptChipText, isSelected && styles.deptChipTextActive]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section 25 & 50: Department Stats Counters */}
            <View style={styles.statsCard}>
              <Text style={styles.statsCardHeader}>
                {selectedDept.toUpperCase()} • ACTIVE METRICS
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#2563EB' }]}>
                    {stats.new_complaints}
                  </Text>
                  <Text style={styles.statLabel}>New Complaints</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>
                    {stats.pending}
                  </Text>
                  <Text style={styles.statLabel}>Pending / Review</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#EA580C' }]}>
                    {stats.in_progress}
                  </Text>
                  <Text style={styles.statLabel}>In Progress</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#059669' }]}>
                    {stats.resolved}
                  </Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                </View>
              </View>
            </View>

            {/* Section 30 & 51: Interactive Nagpur Map View of Complaints */}
            <View style={styles.mapCard}>
              <View style={styles.mapCardHeader}>
                <View style={styles.mapHeaderLeft}>
                  <Ionicons name="map" size={16} color="#0284C7" />
                  <Text style={styles.mapTitle}>Nagpur Infrastructure Hotspots</Text>
                </View>
                <Text style={styles.mapSubCount}>
                  {complaints.length} active location pins
                </Text>
              </View>

              {/* Visual Interactive Nagpur Pinboard */}
              <View style={styles.nagpurPinboard}>
                <Text style={styles.pinboardNote}>
                  📍 Tap any Nagpur corridor below to inspect assigned complaint:
                </Text>
                <View style={styles.pinsGrid}>
                  {complaints.map((c) => {
                    const isSelected = activeMarkerId === c.id;
                    const isStreetlight = c.department_name.includes('Streetlight');
                    const isWater = c.department_name.includes('Water');
                    const pinColor = isStreetlight ? '#A855F7' : isWater ? '#0284C7' : '#EA580C';

                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.pinItem,
                          isSelected && styles.pinItemActive,
                          { borderColor: pinColor },
                        ]}
                        onPress={() => {
                          setActiveMarkerId(isSelected ? null : c.id);
                        }}
                      >
                        <Ionicons
                          name={isStreetlight ? 'bulb' : isWater ? 'water' : 'warning'}
                          size={13}
                          color={pinColor}
                        />
                        <Text style={styles.pinAddress} numberOfLines={1}>
                          {c.address.split(',')[0]}
                        </Text>
                        <Text style={[styles.pinBadge, { color: pinColor }]}>
                          {c.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Highlighted Pin Info Drawer */}
                {activeMarkerId && (
                  <View style={styles.highlightDrawer}>
                    {(() => {
                      const item = complaints.find((x) => x.id === activeMarkerId);
                      if (!item) return null;
                      return (
                        <View style={styles.drawerContent}>
                          <View style={styles.drawerHeader}>
                            <Text style={styles.drawerTitle}>
                              {item.id} • {item.issue_type}
                            </Text>
                            <Text style={styles.drawerSeverity}>{item.severity} Risk</Text>
                          </View>
                          <Text style={styles.drawerAddress}>{item.address}</Text>
                          {item.description ? (
                            <Text style={styles.drawerDesc} numberOfLines={2}>
                              "{item.description}"
                            </Text>
                          ) : null}
                          <TouchableOpacity
                            style={styles.drawerBtn}
                            onPress={() => router.push(`/(officer)/dashboard/ticket/${item.id}` as any)}
                          >
                            <Text style={styles.drawerBtnText}>Inspect Complaint & Update Status →</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            </View>

            {/* Quick Works Coordination Ledger Link (Section 52 Scenario 3) */}
            <TouchableOpacity
              style={styles.worksLedgerBanner}
              onPress={() => router.push('/(officer)/dashboard/works-ledger' as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="git-network-outline" size={20} color="#C2410C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.worksLedgerTitle}>Works Coordination Ledger</Text>
                <Text style={styles.worksLedgerSub}>
                  Inspect road digging schedules & 40-day conflict warnings between NMC, OCW, and MSEDCL
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C2410C" />
            </TouchableOpacity>

            {/* Status Filter Bar */}
            <View style={styles.filterBarRow}>
              <Text style={styles.sectionHeading}>
                DEPARTMENT TICKETS ({filteredComplaints.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipsRow}>
                {['all', 'Submitted', 'Under Review', 'In Progress', 'Resolved'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusChip, selectedStatus === st && styles.statusChipActive]}
                    onPress={() => setSelectedStatus(st)}
                  >
                    <Text style={[styles.statusChipText, selectedStatus === st && styles.statusChipTextActive]}>
                      {st === 'all' ? 'All' : st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.Submitted;
          return (
            <TouchableOpacity
              style={styles.ticketCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/(officer)/dashboard/ticket/${item.id}` as any)}
            >
              <Image source={{ uri: item.image_url }} style={styles.thumb} />
              <View style={styles.ticketBody}>
                <View style={styles.topRow}>
                  <Text style={styles.ticketId}>{item.id}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.defectClass}>{item.issue_type}</Text>
                <Text style={styles.wardText} numberOfLines={1}>
                  📍 {item.address}
                </Text>

                <View style={styles.bottomRow}>
                  <Text style={styles.severityText}>Risk: {item.severity}</Text>
                  {item.ai_confidence ? (
                    <Text style={styles.confText}>
                      AI {(item.ai_confidence * 100).toFixed(1)}%
                    </Text>
                  ) : null}
                  <Text style={styles.actionPrompt}>View & Update →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No complaints in this department filter</Text>
              <Text style={styles.emptySub}>All reported issues have been processed or resolved.</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerDept: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 1,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  switchRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  deptSection: {
    marginTop: 12,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  deptScroll: {
    gap: 6,
    paddingBottom: 4,
  },
  deptChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deptChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  deptChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  deptChipTextActive: {
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsCardHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapSubCount: {
    fontSize: 11,
    color: '#64748B',
  },
  nagpurPinboard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pinboardNote: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  pinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  pinItemActive: {
    backgroundColor: '#0F172A',
  },
  pinAddress: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    maxWidth: 110,
  },
  pinBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  highlightDrawer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerContent: {
    gap: 4,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerSeverity: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  drawerAddress: {
    fontSize: 11,
    color: '#64748B',
  },
  drawerDesc: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
  },
  drawerBtn: {
    marginTop: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  drawerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  worksLedgerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  worksLedgerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },
  worksLedgerSub: {
    fontSize: 11,
    color: '#C2410C',
    marginTop: 2,
    lineHeight: 15,
  },
  filterBarRow: {
    marginTop: 14,
    marginBottom: 8,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statusChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  statusChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  ticketBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  defectClass: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  wardText: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  confText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  actionPrompt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

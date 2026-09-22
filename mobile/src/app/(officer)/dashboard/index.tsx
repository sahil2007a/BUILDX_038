import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Report } from '@/types/report';

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { reports, setReports, setUserRole } = useAppStore();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const data = await api.getReports();
      setReports(data);
    };
    load();
  }, []);

  const filtered = reports.filter((r) => {
    if (selectedDept !== 'all' && !r.assigned_department?.toLowerCase().includes(selectedDept)) {
      return false;
    }
    if (selectedWard !== 'all' && !r.ward?.toLowerCase().includes(selectedWard)) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>NMC / OCW / MSEDCL PORTAL</Text>
          <Text style={styles.headerTitle}>Officer Triage Queue</Text>
        </View>

        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => {
            setUserRole('citizen');
            router.replace('/(citizen)');
          }}
        >
          <Ionicons name="arrow-back" size={14} color="#0F172A" />
          <Text style={styles.switchRoleText}>Citizen View</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Nav to Works Ledger */}
      <TouchableOpacity
        style={styles.worksLedgerBanner}
        onPress={() => router.push('/(officer)/dashboard/works-ledger' as any)}
      >
        <Ionicons name="git-network-outline" size={20} color="#EA580C" />
        <View style={{ flex: 1 }}>
          <Text style={styles.worksLedgerTitle}>Works Coordination Ledger</Text>
          <Text style={styles.worksLedgerSub}>
            Inspect planned utility digs & conflict warnings on resurfaced roads
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#64748B" />
      </TouchableOpacity>

      {/* Ward Filter Row */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>ZONE / WARD FILTER:</Text>
        <View style={styles.chipsRow}>
          {[
            { id: 'all', label: 'All Wards' },
            { id: 'dharampeth', label: 'Dharampeth' },
            { id: 'kamptee', label: 'Kamptee Rd' },
            { id: 'katol', label: 'Katol Rd' },
            { id: 'manish', label: 'Manish Nagar' },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                selectedWard === chip.id && styles.chipActive,
              ]}
              onPress={() => setSelectedWard(chip.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedWard === chip.id && styles.chipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Queue List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.ticketCard}
            onPress={() =>
              router.push(`/(officer)/dashboard/ticket/${item.id}` as any)
            }
          >
            <Image source={{ uri: item.photo_url }} style={styles.thumb} />
            <View style={styles.ticketBody}>
              <View style={styles.topRow}>
                <Text style={styles.ticketId}>#{item.id}</Text>
                <SeverityBadge score={item.severity_score} size="sm" />
              </View>

              <Text style={styles.defectClass}>
                {item.category.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.wardText}>{item.ward}</Text>

              <View style={styles.bottomRow}>
                {item.sla_deadline && (
                  <SLACountdown deadline={item.sla_deadline} compact />
                )}
                <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  switchRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  worksLedgerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  worksLedgerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
  },
  worksLedgerSub: {
    fontSize: 11,
    color: '#9A3412',
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
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
    fontWeight: '700',
    color: '#64748B',
  },
  defectClass: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  wardText: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
});

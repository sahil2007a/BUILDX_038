import React, { useState } from 'react';
import {
  Alert,
  FlatList,
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
import { api } from '@/lib/api';
import { WorksLedgerEntry } from '@/types/worksLedger';

const INITIAL_LEDGER_ENTRIES: WorksLedgerEntry[] = [
  {
    id: 'wl_001',
    road_segment_id: 'seg_kamptee_04',
    agency_id: 'agency_water_nmc',
    agency_name: 'Nagpur Water Works (OCW)',
    road_segment_name: 'Kamptee Road (Indora to Automotive Sq)',
    start_date: '2026-10-05',
    end_date: '2026-10-08',
    purpose: 'Feeder pipeline replacement & valve installation',
    conflict_warning: true,
    created_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'wl_002',
    road_segment_id: 'seg_dharampeth_09',
    agency_id: 'agency_msedcl',
    agency_name: 'MSEDCL Electrical',
    road_segment_name: 'West High Court Road, Dharampeth',
    start_date: '2026-10-12',
    end_date: '2026-10-15',
    purpose: 'Underground high tension cable trenching',
    conflict_warning: false,
    created_at: '2026-09-21T11:30:00Z',
  },
];

export default function WorksLedgerScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<WorksLedgerEntry[]>(INITIAL_LEDGER_ENTRIES);
  const [roadSegment, setRoadSegment] = useState('Katol Road (Gittikhadan)');
  const [agency, setAgency] = useState('Water');
  const [purpose, setPurpose] = useState('Pipe repair');

  const handleCreateEntry = async () => {
    try {
      const res = await api.createWorksLedger({
        road_segment_id: 'seg_katol_12',
        agency,
        start_date: '2026-10-10',
        end_date: '2026-10-14',
        purpose,
      });

      const newEntry: WorksLedgerEntry = {
        id: res.entry_id,
        road_segment_id: 'seg_katol_12',
        agency_id: `agency_${agency.toLowerCase()}`,
        agency_name: agency,
        road_segment_name: roadSegment,
        start_date: '2026-10-10',
        end_date: '2026-10-14',
        purpose,
        conflict_warning: res.conflict_warning,
        created_at: new Date().toISOString(),
      };

      setEntries([newEntry, ...entries]);

      if (res.conflict_warning) {
        Alert.alert(
          '⚠️ Conflict Warning Flagged (TRD §4.5)',
          'This road segment was resurfaced within 90 days. Dig logged, but supervisor approval is required before cutting.'
        );
      } else {
        Alert.alert('Success', 'Excavation work order logged to ledger.');
      }
    } catch (e) {
      console.warn('Works ledger error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Works-Coordination Ledger</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color="#0284C7" />
              <Text style={styles.infoText}>
                Cross-agency coordination prevents repeat excavations of recently
                resurfaced roads across NMC, OCW Water, and MSEDCL.
              </Text>
            </View>

            {/* Quick Log Form */}
            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>LOG PLANNED EXCAVATION (TEST)</Text>

              <TextInput
                style={styles.input}
                value={roadSegment}
                onChangeText={setRoadSegment}
                placeholder="Road Segment Name"
              />

              <TextInput
                style={styles.input}
                value={agency}
                onChangeText={setAgency}
                placeholder="Agency (Water / Roads / Power)"
              />

              <TextInput
                style={styles.input}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="Purpose (e.g., pipeline trenching)"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateEntry}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Check Conflict & Log Dig</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>PLANNED ROAD DIGS IN NAGPUR</Text>
          </>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.entryCard,
              item.conflict_warning && styles.conflictBorder,
            ]}
          >
            <View style={styles.entryHeader}>
              <Text style={styles.segmentName}>{item.road_segment_name}</Text>
              {item.conflict_warning ? (
                <View style={styles.conflictBadge}>
                  <Ionicons name="warning" size={12} color="#DC2626" />
                  <Text style={styles.conflictText}>RECENTLY RESURFACED (90d)</Text>
                </View>
              ) : (
                <View style={styles.clearBadge}>
                  <Text style={styles.clearText}>APPROVED WINDOW</Text>
                </View>
              )}
            </View>

            <Text style={styles.agencyName}>Agency: {item.agency_name}</Text>
            <Text style={styles.purposeText}>Purpose: {item.purpose}</Text>
            <Text style={styles.datesText}>
              Dates: {item.start_date} to {item.end_date}
            </Text>
          </View>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  conflictBorder: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  segmentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  conflictText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  clearBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  agencyName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  purposeText: {
    fontSize: 12,
    color: '#334155',
  },
  datesText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

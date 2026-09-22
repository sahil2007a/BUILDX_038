import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function OfficerTicketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (id) {
          const data = await api.getReport(id);
          setReport(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleUpdateStatus = (newStatus: ReportStatus) => {
    if (!report) return;
    setReport({ ...report, status: newStatus });
    Alert.alert('Status Updated', `Ticket #${report.id} set to ${newStatus}.`);
  };

  const handleSimulateContractorClosure = async () => {
    if (!report) return;
    setVerifying(true);
    try {
      // TRD §4.3: POST /reports/{id}/closure with mock closure photo
      const closurePhoto =
        'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80';
      const res = await api.verifyClosure(report.id, closurePhoto);

      if (res.verified && !res.defect_still_detected) {
        setReport({
          ...report,
          status: 'resolved',
          closure_photo_url: closurePhoto,
        });
        Alert.alert(
          'AI Closure Verified',
          'AI scan on contractor photo confirmed defect resolved. Ticket closed.'
        );
      } else {
        Alert.alert(
          'Closure Rejected',
          'Defect still detected in contractor photo! Escalated to manual review.'
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !report) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Officer Action: #{report.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: report.photo_url }} style={styles.image} />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.categoryText}>
              {report.category.replace('_', ' ').toUpperCase()}
            </Text>
            <SeverityBadge score={report.severity_score} size="md" />
          </View>

          <Text style={styles.ward}>{report.ward}</Text>
          {report.sla_deadline && <SLACountdown deadline={report.sla_deadline} />}

          {report.description && (
            <Text style={styles.desc}>Citizen: {report.description}</Text>
          )}

          <View style={styles.corroboratingBox}>
            <Ionicons name="people" size={16} color="#EA580C" />
            <Text style={styles.corroboratingText}>
              Corroborating Citizens: {report.corroborating_count}
            </Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>TRIAGE & WORKFLOW STATUS</Text>
          <View style={styles.statusButtonsRow}>
            {(['verified', 'assigned', 'in_progress'] as ReportStatus[]).map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusBtn,
                  report.status === st && styles.statusBtnActive,
                ]}
                onPress={() => handleUpdateStatus(st)}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    report.status === st && styles.statusBtnTextActive,
                  ]}
                >
                  {st.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Closure Verification Test Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CLOSURE VERIFICATION (TRD §4.3)</Text>
          <Text style={styles.closureExpl}>
            Contractors must submit an "after" photo. System re-runs detection to prevent gaming closures.
          </Text>

          <TouchableOpacity
            style={styles.closureBtn}
            onPress={handleSimulateContractorClosure}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="scan" size={18} color="#FFFFFF" />
                <Text style={styles.closureBtnText}>
                  Test Contractor Photo & Verify Closure
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    padding: 16,
    gap: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  ward: {
    fontSize: 13,
    color: '#64748B',
  },
  desc: {
    fontSize: 13,
    color: '#334155',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  corroboratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 8,
  },
  corroboratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBtnActive: {
    backgroundColor: '#0F172A',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
  },
  closureExpl: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  closureBtn: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  closureBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

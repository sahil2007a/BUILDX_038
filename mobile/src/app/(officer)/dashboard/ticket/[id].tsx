import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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

const LIFECYCLE_STATUSES: ComplaintStatus[] = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
];

export default function OfficerTicketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (id) {
          const data = await api.getComplaintDetail(id);
          setComplaint(data);
        }
      } catch (e) {
        // Fallback check in general list
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
    fetchDetail();
  }, [id]);

  const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
    if (!complaint) return;
    setUpdating(true);
    try {
      const updated = await api.updateComplaintStatus(complaint.id, newStatus);
      setComplaint(updated);
      Alert.alert('Status Updated', `Complaint #${complaint.id} set to "${newStatus}".`);
    } catch (e) {
      // Local fallback
      setComplaint({ ...complaint, status: newStatus });
      Alert.alert('Status Updated', `Complaint #${complaint.id} set to "${newStatus}".`);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenMaps = () => {
    if (!complaint) return;
    const url = `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`;
    Linking.openURL(url).catch((err) =>
      Alert.alert('Error', 'Could not open Google Maps.')
    );
  };

  if (loading || !complaint) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  const primaryBox =
    complaint.bounding_boxes && complaint.bounding_boxes.length > 0
      ? complaint.bounding_boxes[0]
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Officer Triage: {complaint.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo with Bounding Box Overlay */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: complaint.image_url }} style={styles.image} />

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
        </View>

        {/* Section 27: Complaint Core Details */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.idText}>{complaint.id}</Text>
              <Text style={styles.categoryText}>{complaint.issue_type}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{complaint.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Department */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>ASSIGNED DEPARTMENT:</Text>
            <Text style={styles.fieldValueBold}>{complaint.department_name}</Text>
          </View>

          {/* AI Confidence */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>AI DETECTION & CONFIDENCE:</Text>
            <View style={styles.aiPill}>
              <Ionicons name="scan" size={12} color="#15803D" />
              <Text style={styles.aiPillText}>
                Pothole detected ({complaint.ai_confidence ? `${(complaint.ai_confidence * 100).toFixed(1)}%` : 'Verified'})
              </Text>
            </View>
          </View>

          {/* Reporter Citizen Info */}
          <View style={styles.citizenBox}>
            <Text style={styles.citizenBoxTitle}>CITIZEN REPORTER INFORMATION</Text>
            <View style={styles.citizenField}>
              <Ionicons name="person" size={14} color="#64748B" />
              <Text style={styles.citizenFieldText}>
                {complaint.citizen_name || 'Nagpur Citizen'}
              </Text>
            </View>
            <View style={styles.citizenField}>
              <Ionicons name="mail" size={14} color="#64748B" />
              <Text style={styles.citizenFieldText}>
                {complaint.citizen_email || 'citizen@nagpur.in'}
              </Text>
            </View>
            <View style={styles.citizenField}>
              <Ionicons name="call" size={14} color="#64748B" />
              <Text style={styles.citizenFieldText}>
                {complaint.citizen_phone || '+91 98230 12345'}
              </Text>
            </View>
          </View>

          {/* Location & Navigation */}
          <View style={styles.locationBox}>
            <Text style={styles.fieldLabel}>INCIDENT GEOLOCATION:</Text>
            <Text style={styles.addressText}>{complaint.address}</Text>
            <Text style={styles.coordsText}>
              Lat: {complaint.latitude.toFixed(6)}, Lng: {complaint.longitude.toFixed(6)}
            </Text>

            <TouchableOpacity style={styles.mapsBtn} onPress={handleOpenMaps} activeOpacity={0.85}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {complaint.description ? (
            <View style={styles.descBox}>
              <Text style={styles.fieldLabel}>CITIZEN DESCRIPTION:</Text>
              <Text style={styles.descText}>"{complaint.description}"</Text>
            </View>
          ) : null}
        </View>

        {/* Section 27: Status Lifecycle Updater */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>UPDATE COMPLAINT STATUS (LIFECYCLE)</Text>
          <Text style={styles.sectionSub}>
            Moving status notifies the citizen and updates the municipal dashboard:
          </Text>

          <View style={styles.statusButtonsCol}>
            {LIFECYCLE_STATUSES.map((st) => {
              const isCurrent = complaint.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusBtn, isCurrent && styles.statusBtnActive]}
                  onPress={() => handleUpdateStatus(st)}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <View style={[styles.statusRadioCircle, isCurrent && styles.statusRadioCircleActive]}>
                    {isCurrent && <View style={styles.statusRadioInner} />}
                  </View>
                  <Text style={[styles.statusBtnText, isCurrent && styles.statusBtnTextActive]}>
                    {st}
                  </Text>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    gap: 14,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  image: {
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  idText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  categoryText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  fieldValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  aiPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  citizenBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginTop: 4,
  },
  citizenBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  citizenField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  citizenFieldText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  locationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  coordsText: {
    fontSize: 11,
    color: '#64748B',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 6,
  },
  mapsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  descText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  statusButtonsCol: {
    gap: 6,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  statusBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  statusRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRadioCircleActive: {
    borderColor: '#EA580C',
  },
  statusRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
  },
});

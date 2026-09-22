import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { useAppStore } from '@/lib/store';
import { ALL_DEPARTMENTS, Department } from '@/types/report';

export default function LoginScreen() {
  const router = useRouter();
  const { setCurrentUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');
  const [email, setEmail] = useState('citizen@nagpur.in');
  const [password, setPassword] = useState('password123');
  const [selectedDept, setSelectedDept] = useState<Department>('Roads & Infrastructure');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabSwitch = (tab: 'citizen' | 'officer') => {
    setActiveTab(tab);
    if (tab === 'officer') {
      setEmail('officer.roads@nagpur.gov.in');
    } else {
      setEmail('citizen@nagpur.in');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(email.trim(), password, activeTab);
      // If officer, override or ensure department is set
      const user = res.user;
      if (activeTab === 'officer' && !user.department_name) {
        user.department_name = selectedDept;
      }
      setCurrentUser(user);

      if (activeTab === 'officer') {
        router.replace('/(officer)/dashboard' as any);
      } else {
        router.replace('/(citizen)' as any);
      }
    } catch (e: any) {
      console.warn('Login error:', e);
      Alert.alert('Login Failed', e.response?.data?.detail || 'Could not log in. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={32} color="#EA580C" />
            </View>
            <Text style={styles.title}>RastaRakshak Nagpur</Text>
            <Text style={styles.subtitle}>
              Civic Infrastructure & Pothole Monitoring Platform
            </Text>
          </View>

          {/* Role Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'citizen' && styles.tabActive]}
              onPress={() => handleTabSwitch('citizen')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person"
                size={16}
                color={activeTab === 'citizen' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'citizen' && styles.tabTextActive]}>
                Citizen Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'officer' && styles.tabActive]}
              onPress={() => handleTabSwitch('officer')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="briefcase"
                size={16}
                color={activeTab === 'officer' ? '#FFFFFF' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'officer' && styles.tabTextActive]}>
                Officer Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {activeTab === 'citizen' ? 'Citizen Authentication' : 'NMC Department Officer Login'}
            </Text>
            <Text style={styles.formSub}>
              {activeTab === 'citizen'
                ? 'Report potholes, track repair progress, and hold agencies accountable.'
                : 'Manage department complaints, update work orders, and review field photos.'}
            </Text>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#64748B" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Officer Department Selector (if logging as officer) */}
            {activeTab === 'officer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SELECT OFFICER DEPARTMENT</Text>
                <View style={styles.deptPillsRow}>
                  {ALL_DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDept === dept;
                    return (
                      <TouchableOpacity
                        key={dept}
                        style={[styles.deptPill, isSelected && styles.deptPillActive]}
                        onPress={() => setSelectedDept(dept)}
                      >
                        <Text style={[styles.deptPillText, isSelected && styles.deptPillTextActive]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {activeTab === 'citizen' ? 'Login as Citizen' : 'Login as Department Officer'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Switchers */}
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>QUICK DEMO PROFILES:</Text>
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => {
                    setActiveTab('citizen');
                    setEmail('citizen@nagpur.in');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.demoBtnText}>Nagpur Citizen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => {
                    setActiveTab('officer');
                    setSelectedDept('Roads & Infrastructure');
                    setEmail('officer.roads@nagpur.gov.in');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.demoBtnText}>Roads Officer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => {
                    setActiveTab('officer');
                    setSelectedDept('Streetlight');
                    setEmail('officer.light@nagpur.gov.in');
                    setPassword('password123');
                  }}
                >
                  <Text style={styles.demoBtnText}>Streetlight Officer</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Link to Register */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/auth/register' as any)}>
                <Text style={styles.linkText}>
                  {activeTab === 'citizen' ? 'Create Citizen Account' : 'Register as Officer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginVertical: 18,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  deptPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  deptPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  deptPillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  deptPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  deptPillTextActive: {
    color: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
});

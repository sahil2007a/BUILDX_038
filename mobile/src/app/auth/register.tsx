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

export default function RegisterScreen() {
  const router = useRouter();
  const { setCurrentUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'citizen' | 'officer'>('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState<Department>('Roads & Infrastructure');
  const [ward, setWard] = useState('Nagpur Central / Ward 9');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'citizen') {
        const res = await api.registerCitizen({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password,
        });
        setCurrentUser(res.user);
        Alert.alert('Account Created', 'Welcome to RastaRakshak Nagpur!', [
          { text: 'Continue', onPress: () => router.replace('/(citizen)' as any) },
        ]);
      } else {
        const res = await api.registerOfficer({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password,
          department: department,
          ward: ward.trim() || undefined,
        });
        setCurrentUser(res.user);
        Alert.alert('Officer Profile Registered', `Welcome Er. ${fullName} (${department})`, [
          { text: 'Open Dashboard', onPress: () => router.replace('/(officer)/dashboard' as any) },
        ]);
      }
    } catch (e: any) {
      console.warn('Registration error:', e);
      Alert.alert('Registration Failed', e.response?.data?.detail || 'Could not complete registration.');
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
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Account</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Role Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'citizen' && styles.tabActive]}
              onPress={() => setActiveTab('citizen')}
            >
              <Ionicons name="person" size={15} color={activeTab === 'citizen' ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'citizen' && styles.tabTextActive]}>
                Citizen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'officer' && styles.tabActive]}
              onPress={() => setActiveTab('officer')}
            >
              <Ionicons name="briefcase" size={15} color={activeTab === 'officer' ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'officer' && styles.tabTextActive]}>
                Officer / Engineer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {activeTab === 'citizen' ? 'Nagpur Citizen Registration' : 'Municipal Officer Provisioning'}
            </Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Deshmukh"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ramesh@nagpur.in"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98230 XXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Officer Specific: Department Dropdown */}
            {activeTab === 'officer' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>DEPARTMENT</Text>
                  <View style={styles.deptOptionsGrid}>
                    {ALL_DEPARTMENTS.map((dept) => {
                      const isSelected = department === dept;
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[styles.deptOption, isSelected && styles.deptOptionSelected]}
                          onPress={() => setDepartment(dept)}
                        >
                          <Text style={[styles.deptOptionText, isSelected && styles.deptOptionTextSelected]}>
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>WARD / ZONE ASSIGNMENT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dharampeth / Zone 9"
                    placeholderTextColor="#94A3B8"
                    value={ward}
                    onChangeText={setWard}
                  />
                </View>
              </>
            )}

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Create password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {activeTab === 'citizen' ? 'Register Citizen Account' : 'Register Officer Profile'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already registered?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.linkText}>Back to Login</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0F172A',
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  deptOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deptOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  deptOptionSelected: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  deptOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  deptOptionTextSelected: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
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

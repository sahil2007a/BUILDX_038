import React, { useState } from 'react';
import {
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
import { useAppStore } from '@/lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const { userRole, setUserRole } = useAppStore();
  const [phone, setPhone] = useState('+91 98230 12345');

  const handleLogin = (role: 'citizen' | 'officer') => {
    setUserRole(role);
    if (role === 'officer') {
      router.replace('/(officer)/dashboard' as any);
    } else {
      router.replace('/(citizen)' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#EA580C" />
          </View>
          <Text style={styles.title}>RastaRakshak Nagpur</Text>
          <Text style={styles.subtitle}>
            Single Source of Truth for Road & Civic Infrastructure
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>MOBILE NUMBER (OTP AUTH)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 Mobile number"
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.helperText}>
            Demo credentials: Log in instantly as a Nagpur Citizen or NMC Field Engineer.
          </Text>

          <TouchableOpacity
            style={styles.citizenBtn}
            onPress={() => handleLogin('citizen')}
            activeOpacity={0.85}
          >
            <Ionicons name="person" size={18} color="#FFFFFF" />
            <Text style={styles.citizenBtnText}>Continue as Nagpur Citizen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.officerBtn}
            onPress={() => handleLogin('officer')}
            activeOpacity={0.85}
          >
            <Ionicons name="briefcase" size={18} color="#0F172A" />
            <Text style={styles.officerBtnText}>Continue as NMC Officer / Engineer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  form: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 16,
  },
  citizenBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  citizenBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  officerBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  officerBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});

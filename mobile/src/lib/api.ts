import axios from 'axios';
import {
  Complaint,
  ComplaintStats,
  ComplaintStatus,
  CreateReportRequest,
  CreateReportResponse,
  DetectionFrameResponse,
  DetectionResult,
  FullDetectionResponse,
  Report,
  ReportStatus,
  User,
} from '@/types/report';
import { CreateWorksLedgerRequest } from '@/types/worksLedger';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // When running via Expo Go on physical device or emulator, derive host IP from Expo bundler URI
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000/api/v1`;
    }
  }

  // Fallback for Android device/emulator
  if (Platform.OS === 'android') {
    return 'http://10.22.229.1:8000/api/v1';
  }

  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getBaseUrl();
console.log('[RastaRakshak API] Base URL configured:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // ─── AUTHENTICATION ──────────────────────────────────────────
  async login(email: string, password: string, role: 'citizen' | 'officer' = 'citizen'): Promise<{ token: string; user: User }> {
    const res = await apiClient.post('/auth/login', { email, password, role });
    return res.data;
  },

  async registerCitizen(data: { name: string; email: string; phone?: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await apiClient.post('/auth/register/citizen', data);
    return res.data;
  },

  async registerOfficer(data: { name: string; email: string; phone?: string; password: string; department: string; ward?: string }): Promise<{ token: string; user: User }> {
    const res = await apiClient.post('/auth/register/officer', data);
    return res.data;
  },

  // ─── REAL YOLO INFERENCE (Camera Preview & Gallery) ─────────
  async detectRealFrame(imageBase64: string): Promise<DetectionResult> {
    try {
      const formData = new FormData();
      formData.append('image_base64', imageBase64);
      const res = await apiClient.post('/detect/frame', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (e) {
      console.warn('Real frame detection error:', e);
      return {
        detections: [],
        inference_ms: 0,
        detected: false,
        count: 0,
      };
    }
  },

  async detectFullImage(options: { imageBase64?: string; imageUrl?: string; fileUri?: string }): Promise<DetectionResult> {
    try {
      const formData = new FormData();
      if (options.imageBase64) {
        formData.append('image_base64', options.imageBase64);
      }
      if (options.imageUrl) {
        formData.append('image_url', options.imageUrl);
      }
      if (options.fileUri) {
        // Multipart file upload
        const filename = options.fileUri.split('/').pop() || 'photo.jpg';
        formData.append('image', {
          uri: options.fileUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      const res = await apiClient.post('/detect/full', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (e) {
      console.warn('Full detection error:', e);
      return {
        detections: [],
        inference_ms: 0,
        detected: false,
        count: 0,
        severity_score: 1,
        severity_label: 'Low',
      };
    }
  },

  // ─── COMPLAINTS API ──────────────────────────────────────────
  async createComplaint(data: {
    department: string;
    issue_type?: string;
    image_url: string;
    ai_confidence?: number;
    bounding_boxes?: any[];
    latitude: number;
    longitude: number;
    address: string;
    location_source?: 'gps' | 'manual';
    severity?: string;
    description?: string;
    citizen_name?: string;
    citizen_email?: string;
    citizen_phone?: string;
  }): Promise<Complaint> {
    const res = await apiClient.post<Complaint>('/complaints', data);
    return res.data;
  },

  async getComplaints(params?: {
    department?: string;
    status?: string;
    citizen_id?: string;
  }): Promise<Complaint[]> {
    try {
      const res = await apiClient.get<Complaint[]>('/complaints', { params });
      return res.data;
    } catch (e) {
      console.warn('Failed to load complaints:', e);
      return [];
    }
  },

  async getComplaintDetail(id: string): Promise<Complaint> {
    const res = await apiClient.get<Complaint>(`/complaints/${id}`);
    return res.data;
  },

  async updateComplaintStatus(id: string, status: ComplaintStatus): Promise<Complaint> {
    const res = await apiClient.patch<Complaint>(`/complaints/${id}/status`, { status });
    return res.data;
  },

  async getComplaintStats(department?: string): Promise<ComplaintStats> {
    try {
      const res = await apiClient.get<ComplaintStats>('/complaints/stats', {
        params: department ? { department } : undefined,
      });
      return res.data;
    } catch {
      return { total: 0, pending: 0, in_progress: 0, resolved: 0, new_complaints: 0 };
    }
  },

  // ─── LEGACY METHODS (Preserved for compatibility) ────────────
  async detectFrame(formData: FormData): Promise<DetectionFrameResponse> {
    try {
      const res = await apiClient.post<DetectionFrameResponse>('/detect/frame', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch {
      return { boxes: [], inference_ms: 0 };
    }
  },

  async detectFull(formData: FormData): Promise<FullDetectionResponse> {
    try {
      const res = await apiClient.post<FullDetectionResponse>('/detect/full', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch {
      return {
        severity_score: 3,
        severity_label: 'Medium',
      };
    }
  },

  async createReport(data: CreateReportRequest): Promise<CreateReportResponse> {
    const res = await apiClient.post<CreateReportResponse>('/reports', data);
    return res.data;
  },

  async getReports(params?: { department?: string; ward?: string; status?: string }): Promise<Report[]> {
    try {
      const res = await apiClient.get<Report[]>('/reports', { params });
      return res.data;
    } catch {
      return [];
    }
  },

  async getReport(id: string): Promise<Report> {
    const res = await apiClient.get<Report>(`/reports/${id}`);
    return res.data;
  },

  async confirmDuplicate(id: string): Promise<{ success: boolean; corroborating_count: number }> {
    return { success: true, corroborating_count: 2 };
  },

  async verifyClosure(id: string, closurePhotoUrl: string): Promise<any> {
    return { verified: true, defect_still_detected: false, new_status: 'resolved' };
  },

  async createWorksLedger(data: CreateWorksLedgerRequest): Promise<any> {
    const res = await apiClient.post('/works-ledger', data);
    return res.data;
  },
};

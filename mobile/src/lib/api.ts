import axios from 'axios';
import {
  CreateReportRequest,
  CreateReportResponse,
  DetectionFrameResponse,
  DuplicateCandidate,
  FullDetectionResponse,
  Report,
  ReportStatus,
} from '@/types/report';
import { CreateWorksLedgerRequest, WorksLedgerEntry } from '@/types/worksLedger';
import { getMockFrameDetection } from './detectionPolling';

// Base URL matching TRD §4 (Base URL: /api/v1)
// Configurable via EXPO_PUBLIC_API_URL, defaults to localhost:8000
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// [STUBBED FOR MILESTONE 1]: In-memory storage for submitted mock reports
let mockReportsStore: Report[] = [
  {
    id: 'rpt_nagpur_101',
    category: 'pothole',
    photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    bbox: [0.32, 0.51, 0.18, 0.12],
    confidence: 0.93,
    lat: 21.1458,
    lng: 79.0882,
    description: 'Deep crater on main carriage way near Indora Chowk',
    severity_score: 5,
    status: 'verified',
    assigned_agency_id: 'agency_roads_nmc',
    assigned_department: 'NMC Road Maintenance',
    ward: 'Kamptee Road / Ward 3',
    corroborating_count: 7,
    sla_deadline: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rpt_nagpur_102',
    category: 'road_crack',
    photo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    bbox: [0.25, 0.4, 0.35, 0.22],
    confidence: 0.84,
    lat: 21.1352,
    lng: 79.0621,
    description: 'Extensive alligator cracking after rain near Traffic Park',
    severity_score: 3,
    status: 'assigned',
    assigned_agency_id: 'agency_roads_nmc',
    assigned_department: 'NMC Road Maintenance',
    ward: 'Dharampeth / Ward 9',
    corroborating_count: 2,
    sla_deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rpt_nagpur_103',
    category: 'water_pipeline_damage',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80',
    bbox: [0.2, 0.5, 0.45, 0.3],
    confidence: 0.89,
    lat: 21.1065,
    lng: 79.0812,
    description: 'Drinking water pipeline joint leak eroding sub-base',
    severity_score: 4,
    status: 'in_progress',
    assigned_agency_id: 'agency_water_nmc',
    assigned_department: 'Nagpur Water Works (OCW)',
    ward: 'Manish Nagar / Ward 14',
    corroborating_count: 4,
    sla_deadline: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rpt_nagpur_104',
    category: 'streetlight_fault',
    photo_url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80',
    bbox: [0.35, 0.15, 0.25, 0.6],
    confidence: 0.86,
    lat: 21.1624,
    lng: 79.0558,
    description: 'Damaged light pole leaning dangerously over Katol Road median',
    severity_score: 5,
    status: 'reported',
    assigned_agency_id: 'agency_msedcl',
    assigned_department: 'MSEDCL / NMC Electrical',
    ward: 'Katol Road / Ward 2',
    corroborating_count: 9,
    sla_deadline: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

export const api = {
  // TRD §4.1: POST /detect/frame
  async detectFrame(formData: FormData): Promise<DetectionFrameResponse> {
    try {
      const res = await apiClient.post<DetectionFrameResponse>('/detect/frame', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]: Mock response matching TRD §4.1
      return getMockFrameDetection();
    }
  },

  // TRD §4.1: POST /detect/full
  async detectFull(formData: FormData): Promise<FullDetectionResponse> {
    try {
      const res = await apiClient.post<FullDetectionResponse>('/detect/full', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]: Mock response matching TRD §4.1
      return {
        primary_detection: {
          class: 'pothole',
          confidence: 0.91,
          bbox: [0.32, 0.51, 0.18, 0.12],
        },
        severity_score: 4,
        severity_label: 'High',
      };
    }
  },

  // TRD §4.2: POST /reports
  async createReport(data: CreateReportRequest): Promise<CreateReportResponse> {
    try {
      const res = await apiClient.post<CreateReportResponse>('/reports', data);
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]: Mock creation with duplicate candidate
      const newId = `rpt_${Math.random().toString(36).substring(2, 8)}`;
      const slaDeadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(); // 10 days High Court SLA

      // Mock duplicate check within 30m
      const duplicateCandidates: DuplicateCandidate[] = [];
      const existingNear = mockReportsStore.find((r) => r.category === data.category);
      if (existingNear) {
        duplicateCandidates.push({
          report_id: existingNear.id,
          distance_m: 14,
          visual_similarity: 0.87,
          category: existingNear.category,
          photo_url: existingNear.photo_url,
          ward: existingNear.ward,
        });
      }

      const newReport: Report = {
        id: newId,
        category: data.category,
        photo_url: data.photo_url,
        bbox: data.bbox,
        confidence: data.confidence,
        lat: data.lat,
        lng: data.lng,
        description: data.description,
        severity_score: data.severity_score,
        status: 'reported',
        ward: 'Dharampeth / Ward 9',
        corroborating_count: 1,
        sla_deadline: slaDeadline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockReportsStore.unshift(newReport);

      return {
        report_id: newId,
        status: 'reported',
        duplicate_candidates: duplicateCandidates,
        sla_deadline: slaDeadline,
      };
    }
  },

  // TRD §4.2: POST /reports/{id}/confirm-duplicate
  async confirmDuplicate(
    id: string
  ): Promise<{ success: boolean; corroborating_count: number }> {
    try {
      const res = await apiClient.post(`/reports/${id}/confirm-duplicate`);
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]
      const report = mockReportsStore.find((r) => r.id === id);
      if (report) {
        report.corroborating_count += 1;
        return { success: true, corroborating_count: report.corroborating_count };
      }
      return { success: true, corroborating_count: 2 };
    }
  },

  // TRD §4.2: GET /reports
  async getReports(params?: {
    department?: string;
    ward?: string;
    status?: string;
  }): Promise<Report[]> {
    try {
      const res = await apiClient.get<Report[]>('/reports', { params });
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]
      let list = [...mockReportsStore];
      if (params?.status && params.status !== 'all') {
        list = list.filter((r) => r.status === params.status);
      }
      return list;
    }
  },

  // TRD §4.2: GET /reports/{id}
  async getReport(id: string): Promise<Report> {
    try {
      const res = await apiClient.get<Report>(`/reports/${id}`);
      return res.data;
    } catch {
      // [STUBBED FALLBACK FOR MILESTONE 1]
      const found = mockReportsStore.find((r) => r.id === id);
      if (found) return found;
      return mockReportsStore[0];
    }
  },

  // TRD §4.3: POST /reports/{id}/closure
  async verifyClosure(
    id: string,
    closurePhotoUrl: string
  ): Promise<{
    verified: boolean;
    defect_still_detected: boolean;
    new_status: ReportStatus;
  }> {
    try {
      const res = await apiClient.post(`/reports/${id}/closure`, {
        closure_photo_url: closurePhotoUrl,
      });
      return res.data;
    } catch {
      return {
        verified: true,
        defect_still_detected: false,
        new_status: 'resolved',
      };
    }
  },

  // TRD §4.5: POST /works-ledger
  async createWorksLedger(
    data: CreateWorksLedgerRequest
  ): Promise<{ conflict_warning: boolean; entry_id: string }> {
    try {
      const res = await apiClient.post('/works-ledger', data);
      return res.data;
    } catch {
      return {
        conflict_warning: true,
        entry_id: `wl_${Math.random().toString(36).substring(2, 7)}`,
      };
    }
  },
};

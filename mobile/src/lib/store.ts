import { create } from 'zustand';
import {
  BoundingBox,
  BoundingBoxNormalized,
  Complaint,
  DefectCategory,
  Department,
  PotholeDetectionItem,
  Report,
  SeverityLevel,
  SeverityScore,
  User,
} from '@/types/report';
import { computeSeverity } from './severity';

export interface LocationState {
  latitude: number;
  longitude: number;
  address?: string;
  source?: 'gps' | 'manual';
}

export interface DraftComplaintState {
  photoUri: string | null;
  department: Department;
  issueType: string;
  detections: PotholeDetectionItem[];
  primaryBbox: BoundingBoxNormalized | null;
  confidence: number;
  hasDetection: boolean;
  location: LocationState;
  description: string;
  severityLevel: SeverityLevel;
  severityScore: SeverityScore;
  // Legacy
  category: DefectCategory;
  bbox: [number, number, number, number] | null;
  severityLabel: string;
}

interface AppState {
  // Detection state
  currentBoxes: BoundingBox[];
  currentDetections: PotholeDetectionItem[];
  isDetecting: boolean;
  activeCameraFacing: 'back' | 'front';
  torchOn: boolean;

  // User session
  currentUser: User | null;
  userRole: 'citizen' | 'officer';
  userName: string;
  userPhone: string;

  // Draft complaint
  draft: DraftComplaintState;

  // Complaints & Reports lists
  complaints: Complaint[];
  reports: Report[];

  // Actions
  setCurrentBoxes: (boxes: BoundingBox[]) => void;
  setCurrentDetections: (detections: PotholeDetectionItem[]) => void;
  setIsDetecting: (isDetecting: boolean) => void;
  toggleCameraFacing: () => void;
  toggleTorch: () => void;

  setCurrentUser: (user: User | null) => void;
  setUserRole: (role: 'citizen' | 'officer') => void;

  setDraftDetections: (
    photoUri: string,
    detections: PotholeDetectionItem[]
  ) => void;
  setDraftDepartment: (department: Department) => void;
  setDraftLocation: (location: LocationState) => void;
  setDraftDescription: (description: string) => void;
  setDraftSeverity: (severity: SeverityLevel) => void;
  resetDraft: () => void;

  setComplaints: (complaints: Complaint[]) => void;
  addComplaint: (complaint: Complaint) => void;

  // Legacy
  setDraftPhoto: (uri: string, primaryBox?: BoundingBox | null) => void;
  setDraftCategory: (category: DefectCategory) => void;
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
}

// Default location (Nagpur Zero Mile / Dharampeth)
const DEFAULT_NAGPUR_LOCATION: LocationState = {
  latitude: 21.1458,
  longitude: 79.0882,
  address: 'Indora Chowk / Kamptee Road, Nagpur',
  source: 'gps',
};

const initialDraft: DraftComplaintState = {
  photoUri: null,
  department: 'Roads & Infrastructure',
  issueType: 'Pothole',
  detections: [],
  primaryBbox: null,
  confidence: 0,
  hasDetection: false,
  location: DEFAULT_NAGPUR_LOCATION,
  description: '',
  severityLevel: 'High',
  severityScore: 4,
  // Legacy
  category: 'pothole',
  bbox: null,
  severityLabel: 'High',
};

export const useAppStore = create<AppState>((set, get) => ({
  currentBoxes: [],
  currentDetections: [],
  isDetecting: true,
  activeCameraFacing: 'back',
  torchOn: false,

  currentUser: {
    id: 'usr_citizen_demo',
    name: 'Sahil Ramteke',
    email: 'citizen@nagpur.in',
    phone: '+91 98230 12345',
    role: 'citizen',
    ward: 'Dharampeth',
  },
  userRole: 'citizen',
  userName: 'Sahil Ramteke',
  userPhone: '+91 98230 12345',

  draft: initialDraft,
  complaints: [],
  reports: [],

  setCurrentBoxes: (boxes) => set({ currentBoxes: boxes }),
  setCurrentDetections: (detections) => set({ currentDetections: detections }),
  setIsDetecting: (isDetecting) => set({ isDetecting }),
  toggleCameraFacing: () =>
    set((state) => ({
      activeCameraFacing: state.activeCameraFacing === 'back' ? 'front' : 'back',
    })),
  toggleTorch: () => set((state) => ({ torchOn: !state.torchOn })),

  setCurrentUser: (user) => {
    if (!user) {
      set({ currentUser: null, userRole: 'citizen' });
      return;
    }
    set({
      currentUser: user,
      userRole: user.role,
      userName: user.name,
      userPhone: user.phone || '+91 98230 12345',
    });
  },

  setUserRole: (role) => set({ userRole: role }),

  setDraftDetections: (photoUri, detections) => {
    const current = get().draft;
    const hasDetection = detections.length > 0;
    const primary = hasDetection ? detections[0] : null;

    let score: SeverityScore = 3;
    let label: SeverityLevel = 'Medium';

    if (hasDetection) {
      const maxArea = Math.max(...detections.map((d) => d.bbox.width * d.bbox.height));
      const highestConf = Math.max(...detections.map((d) => d.confidence));
      if (maxArea > 0.15 || highestConf > 0.85) {
        score = 4;
        label = 'High';
      }
      if (maxArea > 0.30) {
        score = 5;
        label = 'Critical';
      }
    }

    set({
      draft: {
        ...current,
        photoUri,
        detections,
        primaryBbox: primary ? primary.bbox : null,
        confidence: primary ? primary.confidence : 0,
        hasDetection,
        bbox: primary ? [primary.bbox.x, primary.bbox.y, primary.bbox.width, primary.bbox.height] : null,
        severityScore: score,
        severityLevel: label,
        severityLabel: label,
      },
    });
  },

  setDraftDepartment: (department) =>
    set((state) => ({
      draft: { ...state.draft, department },
    })),

  setDraftLocation: (location) =>
    set((state) => ({
      draft: { ...state.draft, location },
    })),

  setDraftDescription: (description) =>
    set((state) => ({
      draft: { ...state.draft, description },
    })),

  setDraftSeverity: (severityLevel) =>
    set((state) => ({
      draft: { ...state.draft, severityLevel },
    })),

  resetDraft: () => set({ draft: initialDraft }),

  setComplaints: (complaints) => set({ complaints }),
  addComplaint: (complaint) =>
    set((state) => ({
      complaints: [complaint, ...state.complaints],
    })),

  // Legacy compatibility helpers
  setDraftPhoto: (uri, primaryBox) => {
    if (!primaryBox) {
      get().setDraftDetections(uri, []);
      return;
    }
    const det: PotholeDetectionItem = {
      class: primaryBox.class,
      confidence: primaryBox.confidence,
      bbox: {
        x: primaryBox.x,
        y: primaryBox.y,
        width: primaryBox.w,
        height: primaryBox.h,
      },
    };
    get().setDraftDetections(uri, [det]);
  },

  setDraftCategory: (category) =>
    set((state) => ({
      draft: { ...state.draft, category },
    })),

  setReports: (reports) => set({ reports }),
  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),
}));

import { create } from 'zustand';
import { BoundingBox, DefectCategory, Report, SeverityScore } from '@/types/report';
import { computeSeverity } from './severity';

export interface LocationState {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DraftReport {
  photoUri: string | null;
  category: DefectCategory;
  bbox: [number, number, number, number] | null;
  confidence: number;
  location: LocationState;
  description: string;
  severityScore: SeverityScore;
  severityLabel: string;
}

interface AppState {
  // Detection state
  currentBoxes: BoundingBox[];
  isDetecting: boolean;
  activeCameraFacing: 'back' | 'front';
  torchOn: boolean;

  // Draft report
  draft: DraftReport;

  // User session
  userRole: 'citizen' | 'officer';
  userName: string;
  userPhone: string;

  // Local reports list
  reports: Report[];

  // Actions
  setCurrentBoxes: (boxes: BoundingBox[]) => void;
  setIsDetecting: (isDetecting: boolean) => void;
  toggleCameraFacing: () => void;
  toggleTorch: () => void;
  setDraftPhoto: (
    uri: string,
    primaryBox?: BoundingBox | null
  ) => void;
  setDraftCategory: (category: DefectCategory) => void;
  setDraftLocation: (location: LocationState) => void;
  setDraftDescription: (description: string) => void;
  resetDraft: () => void;
  setUserRole: (role: 'citizen' | 'officer') => void;
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
}

// Default Nagpur coordinates (e.g., Dharampeth / Zero Mile)
const DEFAULT_NAGPUR_LOCATION: LocationState = {
  latitude: 21.1458,
  longitude: 79.0882,
  address: 'Near Indora Square, Kamptee Road, Nagpur',
};

const initialDraft: DraftReport = {
  photoUri: null,
  category: 'pothole',
  bbox: [0.28, 0.45, 0.42, 0.26],
  confidence: 0.91,
  location: DEFAULT_NAGPUR_LOCATION,
  description: '',
  severityScore: 4,
  severityLabel: 'High',
};

export const useAppStore = create<AppState>((set, get) => ({
  currentBoxes: [],
  isDetecting: true,
  activeCameraFacing: 'back',
  torchOn: false,

  draft: initialDraft,

  userRole: 'citizen',
  userName: 'Nagpur Citizen',
  userPhone: '+91 98230 00000',

  reports: [],

  setCurrentBoxes: (boxes) => set({ currentBoxes: boxes }),
  setIsDetecting: (isDetecting) => set({ isDetecting }),
  toggleCameraFacing: () =>
    set((state) => ({
      activeCameraFacing: state.activeCameraFacing === 'back' ? 'front' : 'back',
    })),
  toggleTorch: () => set((state) => ({ torchOn: !state.torchOn })),

  setDraftPhoto: (uri, primaryBox) => {
    const current = get().draft;
    const category = primaryBox?.class ?? current.category;
    const confidence = primaryBox?.confidence ?? current.confidence;
    const bbox: [number, number, number, number] = primaryBox
      ? [primaryBox.x, primaryBox.y, primaryBox.w, primaryBox.h]
      : [0.3, 0.45, 0.4, 0.25];

    // Compute severity using defect size from bbox
    const defectArea = (primaryBox?.w ?? 0.3) * (primaryBox?.h ?? 0.2);
    const { score, label } = computeSeverity(defectArea, true, 'arterial');

    set({
      draft: {
        ...current,
        photoUri: uri,
        category,
        bbox,
        confidence,
        severityScore: score,
        severityLabel: label,
      },
    });
  },

  setDraftCategory: (category) => {
    const current = get().draft;
    // Recompute severity for new category
    const defectArea = (current.bbox?.[2] ?? 0.3) * (current.bbox?.[3] ?? 0.2);
    const { score, label } = computeSeverity(defectArea, true, 'arterial');

    set({
      draft: {
        ...current,
        category,
        severityScore: score,
        severityLabel: label,
      },
    });
  },

  setDraftLocation: (location) =>
    set((state) => ({
      draft: { ...state.draft, location },
    })),

  setDraftDescription: (description) =>
    set((state) => ({
      draft: { ...state.draft, description },
    })),

  resetDraft: () => set({ draft: initialDraft }),

  setUserRole: (role) => set({ userRole: role }),
  setReports: (reports) => set({ reports }),
  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports],
    })),
}));

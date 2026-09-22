export type Department =
  | 'Roads & Infrastructure'
  | 'Water Supply'
  | 'Electricity'
  | 'Streetlight'
  | 'Public Works';

export const ALL_DEPARTMENTS: Department[] = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity',
  'Streetlight',
  'Public Works',
];

export type ComplaintStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface BoundingBoxNormalized {
  x: number; // normalized 0-1 (top-left)
  y: number; // normalized 0-1 (top-left)
  width: number; // normalized 0-1
  height: number; // normalized 0-1
  confidence?: number;
}

export interface PotholeDetectionItem {
  class: string;
  confidence: number;
  bbox: BoundingBoxNormalized;
}

export interface DetectionResult {
  detections: PotholeDetectionItem[];
  inference_ms: number;
  detected: boolean;
  count: number;
  severity_score?: number;
  severity_label?: SeverityLevel;
}

export interface ComplaintLocation {
  latitude: number;
  longitude: number;
  address: string;
  source: 'gps' | 'manual';
}

export interface Complaint {
  id: string; // e.g. RR-2026-0001
  citizen_id?: string;
  citizen_name?: string;
  citizen_email?: string;
  citizen_phone?: string;
  department_id: string;
  department_name: Department;
  issue_type: string;
  image_url: string;
  ai_confidence?: number;
  bounding_boxes?: BoundingBoxNormalized[];
  latitude: number;
  longitude: number;
  address: string;
  location_source: 'gps' | 'manual';
  severity: SeverityLevel;
  description?: string;
  status: ComplaintStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'officer';
  department_name?: Department;
  ward?: string;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  new_complaints: number;
}

// ─── LEGACY TYPES (Maintained for Backward Compatibility) ─────
export type DefectCategory =
  | 'pothole'
  | 'road_crack'
  | 'water_pipeline_damage'
  | 'streetlight_fault';

export type ReportStatus =
  | 'reported'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'resolved';

export type SeverityScore = 1 | 2 | 3 | 4 | 5;

export type SeverityLabel = 'Low' | 'Moderate' | 'Medium' | 'High' | 'Critical';

export interface DetectionFrameResponse {
  boxes: BoundingBox[];
  inference_ms: number;
}

export interface FullDetectionResponse {
  primary_detection?: {
    class: DefectCategory | string;
    confidence: number;
    bbox: [number, number, number, number];
  };
  severity_score: SeverityScore;
  severity_label: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  class: DefectCategory | string;
  confidence: number;
}

export interface DuplicateCandidate {
  report_id: string;
  distance_m: number;
  visual_similarity: number;
  category?: DefectCategory;
  photo_url?: string;
  created_at?: string;
  ward?: string;
}

export interface CreateReportRequest {
  category: DefectCategory;
  photo_url: string;
  bbox?: [number, number, number, number];
  confidence?: number;
  lat: number;
  lng: number;
  description?: string;
  severity_score: SeverityScore;
  ward?: string;
}

export interface CreateReportResponse {
  report_id: string;
  status: ReportStatus;
  duplicate_candidates: DuplicateCandidate[];
  sla_deadline: string;
}

export interface Report {
  id: string;
  category: DefectCategory;
  photo_url: string;
  bbox?: [number, number, number, number];
  confidence?: number;
  lat: number;
  lng: number;
  description?: string;
  severity_score: SeverityScore;
  status: ReportStatus;
  assigned_agency_id?: string;
  assigned_department?: string;
  ward?: string;
  corroborating_count: number;
  sla_deadline?: string;
  closure_photo_url?: string;
  reporter_id?: string;
  created_at: string;
  updated_at: string;
}

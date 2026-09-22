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

export interface BoundingBox {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  w: number; // normalized 0-1
  h: number; // normalized 0-1
  class: DefectCategory;
  confidence: number;
}

export interface DetectionFrameResponse {
  boxes: BoundingBox[];
  inference_ms: number;
}

export interface FullDetectionResponse {
  primary_detection: {
    class: DefectCategory;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, w, h]
  };
  severity_score: SeverityScore;
  severity_label: SeverityLabel;
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

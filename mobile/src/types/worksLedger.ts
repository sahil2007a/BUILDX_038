export interface WorksLedgerEntry {
  id: string;
  road_segment_id: string;
  agency_id: string;
  agency_name?: string;
  road_segment_name?: string;
  start_date: string;
  end_date: string;
  purpose: string;
  conflict_warning: boolean;
  created_at: string;
}

export interface CreateWorksLedgerRequest {
  road_segment_id: string;
  agency: string;
  start_date: string;
  end_date: string;
  purpose: string;
}

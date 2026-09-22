import { DefectCategory } from './report';

export interface Agency {
  id: string;
  name: string;
  asset_types: DefectCategory[];
  ward_coverage: string[];
}

export type RoadClass = 'arterial' | 'collector' | 'inner_lane';

export interface RoadSegment {
  id: string;
  name: string;
  last_resurfaced_date: string;
  road_class: RoadClass;
}

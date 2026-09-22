import { SeverityLabel, SeverityScore } from '@/types/report';
import { RoadClass } from '@/types/agency';

export function computeSeverity(
  defectAreaRatio: number,
  nearSensitiveSite: boolean,
  roadClass: RoadClass,
  daysOpen: number = 0,
  corroborations: number = 0
): { score: SeverityScore; label: SeverityLabel } {
  const w = {
    size: 0.3,
    sensitivity: 0.3,
    road_class: 0.15,
    age: 0.15,
    corroboration: 0.1,
  };

  const roadClassWeights: Record<RoadClass, number> = {
    arterial: 1.0,
    collector: 0.6,
    inner_lane: 0.3,
  };

  const roadWeight = roadClassWeights[roadClass] ?? 0.6;

  const rawScore =
    w.size * Math.min(defectAreaRatio * 5, 1.0) +
    w.sensitivity * (nearSensitiveSite ? 1.0 : 0.0) +
    w.road_class * roadWeight +
    w.age * Math.min(daysOpen / 10, 1.0) +
    w.corroboration * Math.min(corroborations / 5, 1.0);

  const rounded = Math.round(rawScore * 5);
  const clampedScore = Math.max(1, Math.min(5, rounded)) as SeverityScore;

  const labels: Record<SeverityScore, SeverityLabel> = {
    1: 'Low',
    2: 'Moderate',
    3: 'Medium',
    4: 'High',
    5: 'Critical',
  };

  return {
    score: clampedScore,
    label: labels[clampedScore],
  };
}

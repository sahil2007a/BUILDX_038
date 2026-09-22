import { BoundingBox, DefectCategory, DetectionFrameResponse } from '@/types/report';

// [STUBBED FOR MILESTONE 1]: Mock detection generator matching TRD §4.1 contract.
// Will be connected to the real backend in Milestone 3 once backend is stood up.

const MOCK_SCENARIOS: Array<{
  boxes: BoundingBox[];
  inference_ms: number;
}> = [
  {
    boxes: [
      {
        class: 'pothole',
        confidence: 0.91,
        x: 0.28,
        y: 0.45,
        w: 0.42,
        h: 0.26,
      },
    ],
    inference_ms: 185,
  },
  {
    boxes: [
      {
        class: 'pothole',
        confidence: 0.86,
        x: 0.31,
        y: 0.47,
        w: 0.38,
        h: 0.24,
      },
      {
        class: 'road_crack',
        confidence: 0.74,
        x: 0.15,
        y: 0.35,
        w: 0.22,
        h: 0.18,
      },
    ],
    inference_ms: 210,
  },
  {
    boxes: [
      {
        class: 'pothole',
        confidence: 0.94,
        x: 0.29,
        y: 0.46,
        w: 0.40,
        h: 0.25,
      },
    ],
    inference_ms: 195,
  },
  {
    boxes: [
      {
        class: 'water_pipeline_damage',
        confidence: 0.88,
        x: 0.22,
        y: 0.52,
        w: 0.54,
        h: 0.30,
      },
    ],
    inference_ms: 220,
  },
  {
    boxes: [
      {
        class: 'streetlight_fault',
        confidence: 0.83,
        x: 0.38,
        y: 0.18,
        w: 0.24,
        h: 0.55,
      },
    ],
    inference_ms: 190,
  },
];

let scenarioIndex = 0;

/**
 * Returns a mock detection response matching TRD §4.1.
 * Simulates micro-jitter to mimic realistic video tracking.
 */
export async function getMockFrameDetection(
  selectedCategory?: DefectCategory
): Promise<DetectionFrameResponse> {
  // Simulate network + inference latency
  await new Promise((resolve) => setTimeout(resolve, 120));

  if (selectedCategory) {
    const matched = MOCK_SCENARIOS.find((s) =>
      s.boxes.some((b) => b.class === selectedCategory)
    );
    if (matched) {
      return {
        boxes: matched.boxes.map((b) => ({
          ...b,
          x: Math.max(0.05, Math.min(0.85, b.x + (Math.random() * 0.02 - 0.01))),
          y: Math.max(0.05, Math.min(0.85, b.y + (Math.random() * 0.02 - 0.01))),
          confidence: Math.round((b.confidence + (Math.random() * 0.04 - 0.02)) * 100) / 100,
        })),
        inference_ms: Math.floor(180 + Math.random() * 50),
      };
    }
  }

  const scenario = MOCK_SCENARIOS[scenarioIndex % MOCK_SCENARIOS.length];
  scenarioIndex++;

  // Add subtle jitter for realistic visual feedback
  const jitteredBoxes = scenario.boxes.map((box) => ({
    ...box,
    x: Math.max(0.05, Math.min(0.85, box.x + (Math.random() * 0.02 - 0.01))),
    y: Math.max(0.05, Math.min(0.85, box.y + (Math.random() * 0.02 - 0.01))),
    confidence: Math.round((box.confidence + (Math.random() * 0.04 - 0.02)) * 100) / 100,
  }));

  return {
    boxes: jitteredBoxes,
    inference_ms: Math.floor(180 + Math.random() * 50),
  };
}

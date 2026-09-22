import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';

interface DetectionBoxInput {
  class?: string;
  confidence?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Props {
  boxes: DetectionBoxInput[];
  width: number;
  height: number;
}

export const BoundingBoxOverlay: React.FC<Props> = ({ boxes, width, height }) => {
  if (!boxes || boxes.length === 0 || width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Svg width={width} height={height}>
        {boxes.map((box, index) => {
          // Normalized coordinates [0, 1]
          const normX = box.x ?? box.bbox?.x ?? 0;
          const normY = box.y ?? box.bbox?.y ?? 0;
          const normW = box.w ?? box.bbox?.width ?? 0;
          const normH = box.h ?? box.bbox?.height ?? 0;

          if (normW <= 0 || normH <= 0) return null;

          const x = normX * width;
          const y = normY * height;
          const boxWidth = Math.max(normW * width, 40);
          const boxHeight = Math.max(normH * height, 40);

          const conf = box.confidence ?? 0;
          const confidencePct = (conf * 100).toFixed(1);
          const labelText = `POTHOLE ${confidencePct}%`;
          const badgeWidth = Math.max(labelText.length * 7.5 + 14, 115);
          const badgeHeight = 22;

          // Position badge above box if within screen bounds, otherwise inside box
          const badgeY = y > 26 ? y - 24 : y + 4;
          const badgeX = Math.min(x, width - badgeWidth - 4);

          return (
            <G key={`box-${index}-${normX}-${normY}`}>
              {/* Main dashed detection rectangle */}
              <Rect
                x={x}
                y={y}
                width={boxWidth}
                height={boxHeight}
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeDasharray="6, 3"
                fill="rgba(239, 68, 68, 0.18)"
                rx="6"
              />

              {/* Corner accent marks */}
              <Rect x={x} y={y} width={14} height={3} fill="#EF4444" />
              <Rect x={x} y={y} width={3} height={14} fill="#EF4444" />

              <Rect x={x + boxWidth - 14} y={y} width={14} height={3} fill="#EF4444" />
              <Rect x={x + boxWidth - 3} y={y} width={3} height={14} fill="#EF4444" />

              <Rect x={x} y={y + boxHeight - 3} width={14} height={3} fill="#EF4444" />
              <Rect x={x} y={y + boxHeight - 14} width={3} height={14} fill="#EF4444" />

              <Rect x={x + boxWidth - 14} y={y + boxHeight - 3} width={14} height={3} fill="#EF4444" />
              <Rect x={x + boxWidth - 3} y={y + boxHeight - 14} width={3} height={14} fill="#EF4444" />

              {/* Label badge background */}
              <Rect
                x={badgeX}
                y={badgeY}
                width={badgeWidth}
                height={badgeHeight}
                fill="#EF4444"
                rx="4"
              />

              {/* Label text */}
              <SvgText
                x={badgeX + 6}
                y={badgeY + 15}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {labelText}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 20,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { BoundingBox, DefectCategory } from '@/types/report';

interface Props {
  boxes: BoundingBox[];
  width: number;
  height: number;
}

const CATEGORY_COLORS: Record<DefectCategory, { stroke: string; fill: string; bg: string; label: string }> = {
  pothole: {
    stroke: '#EF4444',
    fill: 'rgba(239, 68, 68, 0.18)',
    bg: '#EF4444',
    label: 'POTHOLE',
  },
  road_crack: {
    stroke: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.18)',
    bg: '#F59E0B',
    label: 'ROAD CRACK',
  },
  water_pipeline_damage: {
    stroke: '#0284C7',
    fill: 'rgba(2, 132, 199, 0.18)',
    bg: '#0284C7',
    label: 'WATER PIPELINE',
  },
  streetlight_fault: {
    stroke: '#A855F7',
    fill: 'rgba(168, 85, 247, 0.18)',
    bg: '#A855F7',
    label: 'STREETLIGHT FAULT',
  },
};

export const BoundingBoxOverlay: React.FC<Props> = ({ boxes, width, height }) => {
  if (!boxes || boxes.length === 0 || width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Svg width={width} height={height}>
        {boxes.map((box, index) => {
          const config = CATEGORY_COLORS[box.class] || CATEGORY_COLORS.pothole;
          const x = box.x * width;
          const y = box.y * height;
          const boxWidth = Math.max(box.w * width, 40);
          const boxHeight = Math.max(box.h * height, 40);

          const confidencePct = Math.round(box.confidence * 100);
          const labelText = `${config.label} ${confidencePct}%`;
          const badgeWidth = Math.max(labelText.length * 7.5 + 14, 110);
          const badgeHeight = 24;

          // Position badge above box if within screen, otherwise inside box
          const badgeY = y > 28 ? y - 24 : y;

          return (
            <G key={`box-${index}-${box.class}`}>
              {/* Main detection rectangle */}
              <Rect
                x={x}
                y={y}
                width={boxWidth}
                height={boxHeight}
                stroke={config.stroke}
                strokeWidth="2.5"
                strokeDasharray="6, 3"
                fill={config.fill}
                rx="6"
              />

              {/* Corner accent marks */}
              <Rect x={x} y={y} width={14} height={3} fill={config.stroke} />
              <Rect x={x} y={y} width={3} height={14} fill={config.stroke} />

              <Rect x={x + boxWidth - 14} y={y} width={14} height={3} fill={config.stroke} />
              <Rect x={x + boxWidth - 3} y={y} width={3} height={14} fill={config.stroke} />

              <Rect x={x} y={y + boxHeight - 3} width={14} height={3} fill={config.stroke} />
              <Rect x={x} y={y + boxHeight - 14} width={3} height={14} fill={config.stroke} />

              <Rect x={x + boxWidth - 14} y={y + boxHeight - 3} width={14} height={3} fill={config.stroke} />
              <Rect x={x + boxWidth - 3} y={y + boxHeight - 14} width={3} height={14} fill={config.stroke} />

              {/* Label badge background */}
              <Rect
                x={x}
                y={badgeY}
                width={badgeWidth}
                height={badgeHeight}
                fill={config.bg}
                rx="4"
              />

              {/* Label text */}
              <SvgText
                x={x + 7}
                y={badgeY + 16}
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

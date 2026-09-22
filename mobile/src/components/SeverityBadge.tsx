import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SeverityScore } from '@/types/report';

interface Props {
  score: SeverityScore;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SEVERITY_CONFIG: Record<
  SeverityScore,
  { label: string; bg: string; text: string; border: string }
> = {
  1: {
    label: 'Low Risk',
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
  },
  2: {
    label: 'Moderate',
    bg: '#EFF6FF',
    text: '#2563EB',
    border: '#BFDBFE',
  },
  3: {
    label: 'Medium Risk',
    bg: '#FEF3C7',
    text: '#D97706',
    border: '#FDE68A',
  },
  4: {
    label: 'High Risk',
    bg: '#FFEDD5',
    text: '#EA580C',
    border: '#FED7AA',
  },
  5: {
    label: 'Critical Hazard',
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FECACA',
  },
};

export const SeverityBadge: React.FC<Props> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const config = SEVERITY_CONFIG[score] || SEVERITY_CONFIG[3];

  const sizeStyles = {
    sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 11, badgeDim: 16 },
    md: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 13, badgeDim: 20 },
    lg: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 15, badgeDim: 24 },
  }[size];

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      <View
        style={[
          styles.scoreIndicator,
          {
            backgroundColor: config.text,
            width: sizeStyles.badgeDim,
            height: sizeStyles.badgeDim,
            borderRadius: sizeStyles.badgeDim / 2,
          },
        ]}
      >
        <Text style={styles.scoreText}>{score}</Text>
      </View>
      {showLabel && (
        <Text
          style={[
            styles.labelText,
            { color: config.text, fontSize: sizeStyles.fontSize },
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  scoreIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  labelText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

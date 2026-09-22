import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  deadline: string;
  compact?: boolean;
}

export const SLACountdown: React.FC<Props> = ({ deadline, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    isBreached: boolean;
  }>({ days: 0, hours: 0, minutes: 0, isBreached: false });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, isBreached: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes, isBreached: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft.isBreached) {
    return (
      <View style={[styles.container, styles.breachedContainer]}>
        <Ionicons name="alert-circle" size={compact ? 13 : 16} color="#DC2626" />
        <Text style={[styles.text, styles.breachedText, compact && styles.compactText]}>
          HC SLA BREACHED (Overdue)
        </Text>
      </View>
    );
  }

  const isUrgent = timeLeft.days <= 2;
  const isWarning = timeLeft.days <= 5;

  const colorStyle = isUrgent
    ? styles.urgentContainer
    : isWarning
    ? styles.warningContainer
    : styles.normalContainer;

  const textStyle = isUrgent
    ? styles.urgentText
    : isWarning
    ? styles.warningText
    : styles.normalText;

  const iconColor = isUrgent ? '#DC2626' : isWarning ? '#D97706' : '#059669';

  const timeString =
    timeLeft.days > 0
      ? `${timeLeft.days}d ${timeLeft.hours}h remaining`
      : `${timeLeft.hours}h ${timeLeft.minutes}m remaining`;

  return (
    <View style={[styles.container, colorStyle]}>
      <Ionicons name="time-outline" size={compact ? 13 : 16} color={iconColor} />
      <Text style={[styles.text, textStyle, compact && styles.compactText]}>
        {compact ? timeString : `SLA: ${timeString}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactText: {
    fontSize: 11,
  },
  normalContainer: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  normalText: {
    color: '#059669',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  warningText: {
    color: '#D97706',
  },
  urgentContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  urgentText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  breachedContainer: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  breachedText: {
    color: '#FEF2F2',
    fontWeight: '800',
  },
});

import React from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/config/theme';
import { formatDuration } from '@/utils/interventionTime';

type RunningTimerProps = {
  isRunning: boolean;
  startDate: Date | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
};

export const RunningTimer: React.FC<RunningTimerProps> = ({ isRunning, startDate, plannedStart, plannedEnd }) => {
  const [elapsed, setElapsed] = React.useState('00:00:00');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isRunning) {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    return () => {
      loop.stop();
      glowLoop.stop();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    };
  }, [isRunning, pulseAnim, glowAnim]);

  React.useEffect(() => {
    if (!plannedStart || !plannedEnd) {
      progressAnim.setValue(0);
      return;
    }
    const durationMs = plannedEnd.getTime() - plannedStart.getTime();
    if (durationMs <= 0) {
      progressAnim.setValue(0);
      return;
    }
    const nowTs = isRunning ? Date.now() : plannedStart.getTime();
    const target = Math.min(1, Math.max(0, (nowTs - plannedStart.getTime()) / durationMs));
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [plannedStart, plannedEnd, isRunning, progressAnim]);

  React.useEffect(() => {
    if (!isRunning || !startDate) {
      setElapsed('00:00:00');
      return;
    }
    const update = () => {
      const diff = Date.now() - startDate.getTime();
      setElapsed(formatDuration(diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startDate]);

  if (!isRunning) {
    return null;
  }

  return (
    <Animated.View style={[styles.runningPanel, { transform: [{ scale: pulseAnim }] }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowAnim,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          },
        ]}
      />
      <Text style={styles.runningLabel}>Intervention en cours</Text>
      <Text style={styles.timerValue}>{elapsed}</Text>
      <Text style={styles.textMuted}>Temps écoulé</Text>
      {plannedStart && plannedEnd && (
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  runningPanel: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.xs,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
    zIndex: -1,
  },
  runningLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 32,
    fontFamily: theme.fonts.display,
    color: theme.colors.ink,
  },
  textMuted: {
    color: theme.colors.muted,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e8eef5',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },
});

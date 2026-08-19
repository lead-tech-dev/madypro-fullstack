import React, { useMemo, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../config/theme';

type Props = {
  label: string;
  confirmingLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
};

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;

export const SwipeToConfirm: React.FC<Props> = ({
  label,
  confirmingLabel = 'Relâchez pour confirmer',
  onConfirm,
  disabled,
  tone = 'primary',
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isPastThreshold, setIsPastThreshold] = useState(false);
  const confirmedRef = useRef(false);

  const maxTranslate = Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 0);
  const threshold = maxTranslate * 0.72;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          confirmedRef.current = false;
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(Math.max(gesture.dx, 0), maxTranslate);
          translateX.setValue(next);
          setIsPastThreshold(next >= threshold);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.min(Math.max(gesture.dx, 0), maxTranslate);
          if (next >= threshold && !confirmedRef.current) {
            confirmedRef.current = true;
            Animated.timing(translateX, {
              toValue: maxTranslate,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              onConfirm();
              Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
              setIsPastThreshold(false);
            });
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
            setIsPastThreshold(false);
          }
        },
      }),
    [disabled, maxTranslate, onConfirm, threshold, translateX],
  );

  const trackColor = tone === 'danger' ? theme.colors.danger : theme.colors.ink;

  return (
    <View
      style={[styles.track, { backgroundColor: disabled ? theme.colors.clay : trackColor }]}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={1}>
        {isPastThreshold ? confirmingLabel : label}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [{ translateX }],
            backgroundColor: disabled ? theme.colors.muted : '#fff',
          },
        ]}
      >
        <View style={styles.chevrons}>
          <Ionicons name="chevron-forward" size={20} color={trackColor} style={styles.chevron} />
          <Ionicons name="chevron-forward" size={20} color={trackColor} style={[styles.chevron, styles.chevronSecond]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: theme.radii.pill,
    padding: TRACK_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#fff',
    fontFamily: theme.fonts.bodySemiBold,
    letterSpacing: 1,
  },
  labelDisabled: {
    color: '#fefefe',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  chevrons: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  chevron: {
    fontSize: 20,
    fontFamily: theme.fonts.bodyBold,
    opacity: 0.5,
  },
  chevronSecond: {
    marginLeft: -10,
    opacity: 1,
  },
});

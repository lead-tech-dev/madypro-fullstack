import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

type StaggeredFadeInOptions = {
  duration?: number;
  staggerMs?: number;
  distance?: number;
};

/**
 * Anime l'entrée d'une liste, une ligne après l'autre (fade + léger slide vers le haut).
 * Généralisé depuis le pattern écrit à la main dans AgentHistoryScreen.
 */
export function useStaggeredFadeIn(options?: StaggeredFadeInOptions) {
  const { duration = 220, staggerMs = 60, distance = 10 } = options ?? {};
  const refs = useRef<Animated.Value[]>([]);

  const getItemStyle = (index: number) => {
    if (!refs.current[index]) {
      refs.current[index] = new Animated.Value(0);
      Animated.timing(refs.current[index], {
        toValue: 1,
        duration,
        delay: index * staggerMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    const opacity = refs.current[index];
    const translateY = opacity.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
    return { opacity, transform: [{ translateY }] };
  };

  return { getItemStyle };
}

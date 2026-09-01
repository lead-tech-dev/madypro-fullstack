import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ONBOARDING_STORAGE_KEY } from '@/config/storage';
import { RootStackParamList } from '@/navigation/types';
import { theme } from '@/config/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onFinish?: () => void | Promise<void>;
};

type Slide = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  background: string;
};

const { width } = Dimensions.get('window');

const slides: Slide[] = [
  {
    key: 'missions',
    title: 'Suivez vos missions quotidiennes',
    description: 'Retrouvez toutes vos interventions planifiées et restez prêt pour la journée.',
    icon: 'calendar',
    background: theme.colors.primarySoft,
  },
  {
    key: 'presence',
    title: 'Pointez vos interventions en un geste',
    description: 'Signalez vos arrivées et départs pour que l’équipe sache où vous en êtes.',
    icon: 'check-circle',
    background: theme.colors.sage,
  },
  {
    key: 'support',
    title: 'Restez informé en temps réel',
    description: 'Recevez les notifications importantes de votre manager terrain.',
    icon: 'message-square',
    background: theme.colors.accent,
  },
];

const viewabilityConfig = {
  viewAreaCoveragePercentThreshold: 60,
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

export default function OnboardingScreen({ navigation, onFinish }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    await onFinish?.();
  }, [onFinish]);

  const handleNext = useCallback(() => {
    if (currentIndex === slides.length - 1) {
      completeOnboarding();
      return;
    }
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  }, [completeOnboarding, currentIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index!);
      }
    },
  ).current;

  const renderSlide = useCallback(({ item }: ListRenderItemInfo<Slide>) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <Card style={styles.card}>
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[styles.illustration, { backgroundColor: item.background }]}
          >
            <Feather name={item.icon} size={60} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </Card>
      </View>
    );
  }, []);

  const dotIndexes = useMemo(() => slides.map((_, index) => index), []);
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <Text style={styles.brand}>Madypro Clean</Text>
        <TouchableOpacity onPress={completeOnboarding}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.pagination}>
        {dotIndexes.map((index) => (
          <PaginationDot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      <Animated.View
        key={isLastSlide ? 'commencer' : 'suivant'}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.ctaRow}
      >
        <Button
          fullWidth
          variant="primary"
          title={isLastSlide ? 'Commencer' : 'Suivant'}
          onPress={handleNext}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

function PaginationDot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 28, 8], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], 'clamp');
    return { width: dotWidth, opacity };
  });
  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    paddingVertical: theme.spacing.xl,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  brand: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
  skipText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
  listContent: {
    alignItems: 'stretch',
  },
  slideContainer: {
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 440,
  },
  illustration: {
    width: '100%',
    aspectRatio: 1.4,
    maxHeight: 220,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  slideTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.display,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  slideDescription: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  ctaRow: {
    paddingHorizontal: theme.spacing.xl,
  },
});

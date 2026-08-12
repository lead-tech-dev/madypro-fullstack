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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ONBOARDING_STORAGE_KEY } from '@/config/storage';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onFinish?: () => void | Promise<void>;
};

type Slide = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  background: string;
};

const { width } = Dimensions.get('window');

const slides: Slide[] = [
  {
    key: 'missions',
    title: 'Suivez vos missions quotidiennes',
    description: 'Retrouvez toutes vos interventions planifiées et restez prêt pour la journée.',
    icon: 'calendar',
    accent: '#0f62fe',
    background: '#e8f0ff',
  },
  {
    key: 'presence',
    title: 'Pointez vos interventions en un geste',
    description: 'Signalez vos arrivées et départs pour que l’équipe sache où vous en êtes.',
    icon: 'check-circle',
    accent: '#0e7c86',
    background: '#e3f4f6',
  },
  {
    key: 'support',
    title: 'Restez informé en temps réel',
    description: 'Recevez les notifications importantes de votre manager terrain.',
    icon: 'message-square',
    accent: '#b34700',
    background: '#fff2e7',
  },
];

const viewabilityConfig = {
  viewAreaCoveragePercentThreshold: 60,
};

export default function OnboardingScreen({ navigation, onFinish }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    await onFinish?.();
  }, [navigation, onFinish]);

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
        <View style={styles.card}>
          <View style={[styles.illustration, { backgroundColor: item.background }]}>
            <Feather name={item.icon} size={60} color={item.accent} />
          </View>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  }, []);

  const paginationDots = useMemo(
    () => (
      <View style={styles.pagination}>
        {slides.map((slide, index) => (
          <View
            key={slide.key}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
            accessibilityRole="none"
          />
        ))}
      </View>
    ),
    [currentIndex],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        <Text style={styles.brand}>Madypro Clean</Text>
        <TouchableOpacity onPress={completeOnboarding}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.listContent}
      />

      {paginationDots}

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>
          {currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 24,
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  brand: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#6b645c',
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    color: '#0f62fe',
    fontWeight: '600',
  },
  listContent: {
    alignItems: 'stretch',
  },
  slideContainer: {
    paddingHorizontal: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#f8f4ed',
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    minHeight: 440,
  },
  illustration: {
    width: '100%',
    aspectRatio: 1.4,
    maxHeight: 220,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1f21',
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 16,
    color: '#5a5a5f',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0c7be',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#0f62fe',
  },
  primaryButton: {
    backgroundColor: '#0f62fe',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

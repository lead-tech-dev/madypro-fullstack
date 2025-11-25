import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ONBOARDING_STORAGE_KEY } from '../src/config/storage';

export default function Index() {
  const [isReady, setReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        setHasCompletedOnboarding(storedValue === 'true');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#0f62fe" />
      </View>
    );
  }

  return <Redirect href={hasCompletedOnboarding ? '/(auth)/login' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

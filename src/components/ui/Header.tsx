import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { theme } from '../../config/theme';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  trailing?: React.ReactNode;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle, accent, trailing }) => {
  return (
    <ImageBackground
      source={require('../../../assets/images/header-texture.png')}
      resizeMode="cover"
      style={styles.container}
      imageStyle={styles.image}
    >
      <View style={styles.content}>
        <Text style={styles.accent}>{accent ?? 'Madypro Clean'}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: theme.colors.primarySoft,
    marginBottom: 0,
  },
  image: {
    opacity: 0.12,
  },
  content: {
    gap: 4,
  },
  accent: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#020912',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b645c',
  },
});

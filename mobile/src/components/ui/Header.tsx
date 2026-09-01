import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../config/theme';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  trailing?: React.ReactNode;
  /** Écran secondaire (accessible seulement par navigation, pas par un onglet) : affiche un
   * bouton retour explicite, pour ne pas dépendre du seul geste/bouton matériel Android — qui
   * peut sortir de l'app entièrement une fois la pile de navigation épuisée. */
  showBack?: boolean;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle, accent, trailing, showBack }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {(accent !== '' || showBack) && (
          <View style={styles.topRow}>
            {accent !== '' ? (
              <Text style={styles.accent}>{accent ?? 'Madypro Clean'}</Text>
            ) : (
              <View />
            )}
            {showBack && (
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Retour"
              >
                <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
                <Text style={styles.backLabel}>Retour</Text>
              </Pressable>
            )}
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.primarySoft,
    marginBottom: 0,
  },
  content: {
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
  accent: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bodySemiBold,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.display,
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.muted,
  },
});

import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, HeaderProps } from '../ui/Header';
import { theme } from '../../config/theme';

type HeaderLayoutProps = HeaderProps & {
  children: React.ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export const HeaderLayout: React.FC<HeaderLayoutProps> = ({
  children,
  scrollable = true,
  contentStyle,
  ...headerProps
}) => {
  const body = (
    <View style={styles.inner}>
      <View style={styles.headerShell}>
        <Header {...headerProps} />
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollable ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.container, styles.scrollContainer]}>{body}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  scrollContainer: {
    padding: theme.spacing.xl,
    flexGrow: 1,
  },
  inner: {
    flexGrow: 1,
  },
  headerShell: {
    borderRadius: theme.radii.lg + 8,
    padding: 3,
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  content: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
});

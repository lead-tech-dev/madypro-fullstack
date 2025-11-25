import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

Ionicons.loadFont?.();

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type AgentTabBarProps = BottomTabBarProps & {
  iconMap: Record<string, TabMeta>;
};

export const AgentTabBar: React.FC<AgentTabBarProps> = ({ state, navigation, iconMap }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = iconMap[route.name] ?? {
            label: route.name,
            icon: 'ellipse-outline',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                <Ionicons
                  name={meta.icon}
                  size={isFocused ? 26 : 22}
                  color={isFocused ? '#020912' : '#6b645c'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#020912',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  iconWrapper: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: '#dbe9e0',
  },
});

import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from './styles';

// Abas horizontais simples para reduzir densidade visual das páginas.
export default function IntegrationTabs({ tabs, activeKey, onChange, accentColor }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            style={[
              styles.tabButton,
              active && {
                backgroundColor: withOpacity(accentColor, 0.12),
                borderColor: withOpacity(accentColor, 0.24),
              },
            ]}
            onPress={() => onChange(tab.key)}>
            <Text style={[styles.tabLabel, active && { color: accentColor }]}>
              {tab.label}
            </Text>

            {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
              <View
                style={[
                  styles.tabBadge,
                  active && { backgroundColor: withOpacity(accentColor, 0.14) },
                ]}>
                <Text style={[styles.tabBadgeText, active && { color: accentColor }]}>
                  {tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

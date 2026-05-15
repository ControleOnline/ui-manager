import React, { useState, useEffect, useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-animatable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import AppMenuGrid from '@controleonline/ui-layout/src/react/components/AppMenuGrid';
import styles from './index.styles';
	
const createTone = solid => ({
  solid,
  soft: `${solid}1F`,
});

// Usa hex com alpha no fundo para evitar remapeamento antes da opacidade.
const HEX = {
  info: createTone('#3B82F6'),
  success: createTone('#22C55E'),
  warning: createTone('#F59E0B'),
  error: createTone('#EF4444'),
  purple: createTone('#8B5CF6'),
  orange: createTone('#F97316'),
  muted: createTone('#64748B'),
};

export default function HomePage({ navigation }) {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const { colors: themeColors, menus } = themeStore.getters;
  const { currentCompany } = peopleStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [stats, setStats] = useState([
    { label: global.t?.t('configs', 'stat_label', 'orders'), value: '...', icon: 'shopping-bag', tone: HEX.info, route: 'OrderHistoryPage' },
    { label: global.t?.t('configs', 'stat_label', 'customers'), value: '...', icon: 'users', tone: HEX.success, route: 'ClientsIndex' },
  ]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!currentCompany?.id) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [ordersRes, clientsRes] =
          await Promise.all([
            api.fetch('/orders', { params: { provider: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/people', { params: { 'link.company': `/people/${currentCompany.id}`, 'link.linkType': 'client', itemsPerPage: 1 } }).catch(() => null),
          ]);

        setStats([
          { label: global.t?.t('configs', 'stat_label', 'orders'), value: String(ordersRes?.totalItems ?? '—'), icon: 'shopping-bag', tone: HEX.info, route: 'OrderHistoryPage' },
          { label: global.t?.t('configs', 'stat_label', 'customers'), value: String(clientsRes?.totalItems ?? '—'), icon: 'users', tone: HEX.success, route: 'ClientsIndex' },
        ]);
      } catch {
        // mantém os valores padrão
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentCompany?.id]);

  const go = (route, params = undefined) => navigation.navigate(route, params);

  if (!currentCompany || !themeColors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEX.info.solid} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: brandColors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <Text style={styles.overviewLabel}>{global.t?.t('configs', 'section_title', 'overview')}</Text>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => go(stat.route)}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.tone.soft }]}>
                <Icon name={stat.icon} size={17} color={stat.tone.solid} />
              </View>
              {loadingStats ? (
                <ActivityIndicator
                  size="small"
                  color={stat.tone.solid}
                  style={styles.statLoader}
                />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner — Resultado */}
        <TouchableOpacity
          style={[styles.actionBanner, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.9}
          onPress={() => go('IncomeStatement')}
        >
          <View style={styles.actionContent}>
            <View>
              <Text style={styles.actionTitle}>{global.t?.t('configs', 'button_title', 'results')}</Text>
              <Text style={styles.actionSub}>{global.t?.t('configs', 'section_title', 'resultsDescription')}</Text>
            </View>
            <View style={styles.actionArrow}>
              <Icon name="arrow-right" size={20} color={brandColors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <AppMenuGrid menus={menus} navigation={navigation} />

      </ScrollView>
    </View>
  );
}

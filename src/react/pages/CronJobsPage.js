import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { app_type_base } from '@appType';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { userHasRole } from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import styles from './CronJobsPage.styles';

export default function CronJobsPage() {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const authStore = useStore('auth');

  const { currentCompany, defaultCompany } = peopleStore.getters || {};
  const { user } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};

  const isAdminApp = app_type_base === 'ADMIN';
  const canManageCronJobs = isAdminApp && userHasRole(user, 'ROLE_SUPER');
  const mainCompany = defaultCompany || currentCompany || null;
  const mainCompanyId = mainCompany?.id || null;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(mainCompany?.theme?.colors || {}) },
        colors,
      ),
    [mainCompany?.id, mainCompany?.theme?.colors, themeColors],
  );

  const requestParams = useMemo(
    () =>
      mainCompanyId
        ? { people: `/people/${String(mainCompanyId).replace(/\D+/g, '')}` }
        : {},
    [mainCompanyId],
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Jobs agendados',
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ajuda sobre jobs agendados"
          activeOpacity={0.82}
          onPress={() =>
            Alert.alert(
              'Jobs agendados',
              'A lista vem do banco e os campos de ultima execucao e status sao gravados pelo comando-base.',
            )
          }
          style={styles.headerHelpButton}
        >
          <Text style={styles.headerHelpText}>?</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const openCronLogs = useCallback(
    row => {
      if (!row?.id) {
        return;
      }

      navigation.navigate('EntityLogPage', {
        id: row.id,
        store: 'cron_jobs',
        entityClass: 'ControleOnline\\Entity\\CronJob',
        entityLabel: row?.title || `Cron #${row.id}`,
      });
    },
    [navigation],
  );

  const CronJobRowActions = useCallback(
    ({ row }) => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Abrir logs de ${row?.title || `cron ${row?.id || ''}`}`.trim()}
        activeOpacity={0.82}
        onPress={() => openCronLogs(row)}
        style={styles.rowActionButton}
      >
        <Icon name="file-text" size={14} color={palette.primary} />
      </TouchableOpacity>
    ),
    [openCronLogs, palette.primary],
  );

  if (!canManageCronJobs) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>Acesso restrito</Text>
          <Text style={styles.deniedText}>
            Esta tela de cron jobs fica disponível apenas no app `ADMIN` para `ROLE_SUPER`.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mainCompanyId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Carregando empresa principal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.tableCard}>
          <DefaultTable
            accentColor={palette.primary}
            requestParams={requestParams}
            storeName="cron_jobs"
            rowActionsComponent={CronJobRowActions}
            visibleColumnsPreferenceKey="cron_jobs"
            showTotalItemsInCompactToolbar
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

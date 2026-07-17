import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { app_type_base } from '@appType';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { userHasRole } from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import styles from './CronJobsPage.styles';

const tt = (type, key) => global.t?.t('configs', type, key);

export default function CronJobsPage() {
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

  const mainCompanyLabel =
    mainCompany?.name || mainCompany?.alias || `Empresa ${mainCompanyId || ''}`.trim();

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
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Icon name="clock" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>
                {tt('hub_eyebrow', 'cronJobs') || 'ADMIN'}
              </Text>
              <Text style={styles.heroTitle}>Jobs agendados</Text>
            </View>
          </View>

          <Text style={styles.heroText}>
            Os comandos aqui são lidos do Symfony, escolhidos por catálogo e persistidos no banco da empresa principal.
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroPill}>
              <Icon name="home" size={14} color="#FFFFFF" />
              <Text style={styles.heroPillText}>{mainCompanyLabel}</Text>
            </View>
            <View style={styles.heroPill}>
              <Icon name="terminal" size={14} color="#FFFFFF" />
              <Text style={styles.heroPillText}>Comandos do sistema</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableCard}>
          <DefaultTable
            accentColor={palette.primary}
            requestParams={requestParams}
            storeName="cron_jobs"
            visibleColumnsPreferenceKey="cron_jobs"
            showTotalItemsInCompactToolbar
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

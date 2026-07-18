import React, { useCallback, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import { app_type_base } from '@appType';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { userHasRole } from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import styles from './PeopleDomainsPage.styles';

export default function PeopleDomainsPage() {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const authStore = useStore('auth');
  const { currentCompany, defaultCompany } = peopleStore.getters || {};
  const { user } = authStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};

  const isAdminApp = app_type_base === 'ADMIN';
  const canManagePeopleDomains = isAdminApp && userHasRole(user, 'ROLE_SUPER');
  const mainCompany = defaultCompany || currentCompany || null;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(mainCompany?.theme?.colors || {}) },
        colors,
      ),
    [mainCompany?.id, mainCompany?.theme?.colors, themeColors],
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Domínios',
    });
  }, [navigation]);

  const openDomainDetail = useCallback(
    row => {
      const id = String(row?.id || '').replace(/\D+/g, '');

      if (!id) {
        return;
      }

      navigation.navigate('PeopleDomainDetailPage', {
        id,
      });
    },
    [navigation],
  );

  if (!canManagePeopleDomains) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>Acesso restrito</Text>
          <Text style={styles.deniedText}>
            Esta tela de domínios fica disponível apenas no app `ADMIN` para `ROLE_SUPER`.
          </Text>
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
            onRowPress={openDomainDetail}
            storeName="people_domains"
            visibleColumnsPreferenceKey="people_domains"
            showTotalItemsInCompactToolbar
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

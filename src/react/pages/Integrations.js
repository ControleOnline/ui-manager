import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';
import { getOrderChannelLogo } from '@assets/ppc/channels';

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});



const availableIntegrations = [
  {
    key: '99food',
    label: '99Food',
    description: global.t?.t('configs','description','99description'),
    route: 'Food99IntegrationPage',
    accent: '#F97316',
    app: '99Food',
  },
  {
    key: 'ifood',
    label: 'iFood',
    description: global.t?.t('configs','description','ifooddescription'),
    route: 'IFoodIntegrationPage',
    accent: '#EA580C',
    app: 'iFood',
  },
];

const formatApiError = error => {
  if (!error) return global.t?.t('configs','erro','unableLoadIntegrations');
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || global.t?.t('configs','erro','unableLoadIntegrations');
};

export default function IntegrationsPage({ navigation }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showInfo } = useToastMessage();

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [integrationItems, setIntegrationItems] = useState([]);

  const providerId = currentCompany?.id;

  const integrationCards = useMemo(() => {
    const responseMap = new Map((integrationItems || []).map(item => [item?.key, item]));

    return availableIntegrations.map(item => {
      const responseItem = responseMap.get(item.key);
      const logo = getOrderChannelLogo({ app: item.app });
      return {
        ...item,
        logo,
        connected: Boolean(responseItem?.connected),
        remoteConnected: Boolean(responseItem?.remote_connected),
        store: responseItem?.store || responseItem?.selected_store || null,
        storeError: responseItem?.store_error || null,
        integrationCode:
          responseItem?.food99_code
          || responseItem?.ifood_code
          || responseItem?.merchant_id
          || null,
        eligibleProductCount: responseItem?.eligible_product_count || 0,
      };
    });
  }, [integrationItems]);

  const loadIntegrations = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.fetch('/marketplace/integrations', {
        params: { provider_id: providerId },
      });
      setIntegrationItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [providerId, showError]);

  useFocusEffect(
    useCallback(() => {
      loadIntegrations();
    }, [loadIntegrations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadIntegrations();
    } finally {
      setRefreshing(false);
    }
  }, [loadIntegrations]);

  const handleOpenIntegration = useCallback(
    integration => {
      if (!integration.route) {
        showInfo(global.t?.t('configs','erro','futureIntegration'));
        return;
      }

      navigation.navigate(integration.route);
    },
    [navigation, showInfo],
  );

  const handleOpenHistory = useCallback(() => {
    navigation.navigate('Food99OrderHistoryPage');
  }, [navigation]);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>{global.t?.t('configs','message','selectCompany')}</Text>
          <Text style={styles.centerStateText}>
            {global.t?.t('configs','message','integrationCenterReflectsActiveCompany')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={brandColors.primary} />
          <Text style={styles.centerStateTitle}>{global.t?.t('configs','message','loadingIntegrations')}</Text>
          <Text style={styles.centerStateText}>
            {global.t?.t('configs','message','fetchingAvailableChannels')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        }>
        <View
          style={[
            styles.heroCard,
            shadowStyle,
            { backgroundColor: brandColors.primary },
          ]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{global.t?.t('configs','label','marketplace')}</Text>
            <Text style={styles.heroTitle}>{global.t?.t('configs','label','integrationCenter')}</Text>
            <Text style={styles.heroText}>
              {global.t?.t('configs','label','integrationCenterDescription')}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="layers" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={styles.companyRow}>
          <View>
            <Text style={styles.sectionTitle}>{global.t?.t('configs','label','activeCompany')}</Text>
            <Text style={styles.companyName}>{currentCompany?.name || currentCompany?.alias || `${global.t?.t('configs','label','company')} #${providerId}`}</Text>
          </View>
          <View style={styles.companyBadge}>
            <Text style={styles.companyBadgeText}>{integrationCards.length} {global.t?.t('configs','label','channels')}</Text>
          </View>
        </View>

        <View style={styles.integrationList}>
          {integrationCards.map(integration => {
            const statusTone = integration.connected ? '#16A34A' : integration.route ? '#F59E0B' : '#64748B';
            const statusText = integration.connected
              ? global.t?.t('configs','label','connected')
              : integration.route
                ? global.t?.t('configs','label','readyToConfigure')
                : global.t?.t('configs','label','comingSoon');
            const storeLabel = integration.store?.name
              || (integration.connected ? global.t?.t('configs','label','locallyLinked') : global.t?.t('configs','label','notLinked'));

            return (
              <TouchableOpacity
                key={integration.key}
                style={[styles.integrationCard, shadowStyle]}
                activeOpacity={0.9}
                onPress={() => handleOpenIntegration(integration)}>
                <View style={styles.integrationTopRow}>
                  <View style={[styles.integrationLogoWrap, { backgroundColor: withOpacity(integration.accent, 0.12) }]}>
                    {integration.logo ? (
                      <Image source={integration.logo} style={styles.integrationLogo} resizeMode="contain" />
                    ) : (
                      <Icon name="box" size={18} color={integration.accent} />
                    )}
                  </View>
                  <View style={[styles.integrationStatus, { backgroundColor: withOpacity(statusTone, 0.12) }]}>
                    <Text style={[styles.integrationStatusText, { color: statusTone }]}>{statusText}</Text>
                  </View>
                </View>

                <Text style={styles.integrationTitle}>{integration.label}</Text>
                <Text style={styles.integrationDescription}>{integration.description}</Text>

                <View style={styles.integrationMetaRow}>
                  <View style={styles.integrationMetaItem}>
                    <Text style={styles.integrationMetaLabel}>{global.t?.t('configs','label','eligibleProducts')}</Text>
                    <Text style={styles.integrationMetaValue}>{integration.eligibleProductCount}</Text>
                  </View>
                  <View style={styles.integrationMetaItem}>
                    <Text style={styles.integrationMetaLabel}>{global.t?.t('configs','label','store')}</Text>
                    <Text style={styles.integrationMetaValue} numberOfLines={1}>
                      {storeLabel}
                    </Text>
                  </View>
                </View>

                {integration.connected && !integration.remoteConnected ? (
                  <Text style={styles.integrationHint}>
                    {global.t?.t('configs','label','locallyLinkedHint')}
                  </Text>
                ) : null}

                <View style={styles.integrationFooter}>
                  <Text style={styles.integrationFooterText}>
                    {integration.route ? global.t?.t('configs','label','openIntegration') : global.t?.t('configs','label','comingSoon')}
                  </Text>
                  <Icon name={integration.route ? 'arrow-right' : 'clock'} size={16} color={integration.route ? brandColors.primary : '#94A3B8'} />
                </View>

                {integration.key === '99food' ? (
                  <TouchableOpacity
                    style={styles.historyButton}
                    activeOpacity={0.85}
                    onPress={event => {
                      event?.stopPropagation?.();
                      handleOpenHistory();
                    }}>
                    <Icon name="clock" size={16} color="#C2410C" />
                    <Text style={styles.historyButtonText}>Ver historico de pedidos</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  centerStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 16,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  companyBadge: {
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  companyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  integrationList: {
    gap: 14,
  },
  integrationCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
  },
  integrationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  integrationLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationLogo: {
    width: 28,
    height: 28,
  },
  integrationStatus: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  integrationStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  integrationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  integrationDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 16,
  },
  integrationHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 16,
  },
  integrationMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  integrationMetaItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
  },
  integrationMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  integrationMetaValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },
  integrationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  integrationFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
  },
});

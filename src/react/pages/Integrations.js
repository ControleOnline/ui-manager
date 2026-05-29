import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import {api} from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import {useStore} from '@store';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

import {
  INTEGRATION_LIST,
  parseIntegrationCollection,
} from './integrationsCatalog';
import styles from './Integrations.styles';

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: {elevation: 3},
  web: {boxShadow: '0 10px 24px rgba(15,23,42,0.08)'},
});

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar as integracoes.';
  if (typeof error === 'string') return error;
  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel carregar as integracoes.'
  );
};

const isConnectedValue = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).trim().toLowerCase() === 'true';

const renderIntegrationIcon = integration => {
  if (integration.logo) {
    return (
      <Image
        source={integration.logo}
        style={styles.integrationLogo}
        resizeMode="contain"
      />
    );
  }

  return (
    <Icon
      name={integration.icon || 'box'}
      size={20}
      color={integration.accent}
    />
  );
};

export default function IntegrationsPage({navigation}) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {showError, showInfo} = useToastMessage();

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
    const responseMap = new Map(
      (integrationItems || []).map(item => [item?.key, item]),
    );

    return INTEGRATION_LIST.map(item => {
      const responseItem = responseMap.get(item.key);

      return {
        ...item,
        connected: isConnectedValue(responseItem?.connected),
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
        params: {provider_id: providerId},
      });

      setIntegrationItems(parseIntegrationCollection(response));
    } catch (error) {
      showError(formatApiError(error));
      setIntegrationItems([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, showError]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
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
        showInfo('Essa integracao ainda nao esta disponivel.');
        return;
      }

      navigation.navigate(integration.route, {
        providerKey: integration.routeParams?.providerKey || integration.key,
      });
    },
    [navigation, showInfo],
  );

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            O hub de integracoes depende da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: brandColors.background}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={brandColors.primary} />
          <Text style={styles.centerStateTitle}>Carregando integracoes</Text>
          <Text style={styles.centerStateText}>
            Buscando o status de conexao da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary}
          />
        }>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Integracoes</Text>
          <Text style={styles.pageSubtitle}>
            Toque em uma integracao para abrir a configuracao. O status mostra
            se a empresa ativa ja tem as credenciais necessarias.
          </Text>
        </View>

        <View style={styles.integrationGrid}>
          {integrationCards.map(integration => {
            const connected = Boolean(integration.connected);
            const statusTone = connected ? '#16A34A' : '#F59E0B';
            const statusText = connected ? 'Conectado' : 'Pendente';

            return (
              <TouchableOpacity
                key={integration.key}
                style={[styles.integrationCard, shadowStyle]}
                activeOpacity={0.9}
                onPress={() => handleOpenIntegration(integration)}>
                <View style={styles.integrationTopRow}>
                  <View
                    style={[
                      styles.integrationIconWrap,
                      {backgroundColor: withOpacity(integration.accent, 0.12)},
                    ]}>
                    {renderIntegrationIcon(integration)}
                  </View>

                  <View
                    style={[
                      styles.integrationStatus,
                      {backgroundColor: withOpacity(statusTone, 0.12)},
                    ]}>
                    <Text
                      style={[
                        styles.integrationStatusText,
                        {color: statusTone},
                      ]}>
                      {statusText}
                    </Text>
                  </View>
                </View>

                <Text style={styles.integrationTitle} numberOfLines={1}>
                  {integration.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

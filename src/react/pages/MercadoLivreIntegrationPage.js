import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
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

import styles from './IntegrationConfigPage.styles';

const PROVIDER = {
  key: 'mercadolivre',
  label: 'Mercado Livre',
  accent: '#8A6A00',
  button: '#111827',
  icon: 'shopping-bag',
};

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

const normalizeTextValue = value => String(value ?? '').trim();

const isConnected = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).trim().toLowerCase() === 'true';

const formatApiError = error =>
  error?.message ||
  error?.description ||
  error?.error ||
  'Nao foi possivel carregar a integracao Mercado Livre.';

const MERCADO_LIVRE_OAUTH_QUERY_KEYS = [
  'code',
  'state',
  'error',
  'error_description',
  'mercadolivre_connected',
  'mercadolivre_error',
];

const resolveFrontOAuthRedirectUri = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const url = new URL(window.location.href);
  MERCADO_LIVRE_OAUTH_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  url.hash = '';

  return url.toString();
};

const replaceFrontOAuthStatus = statusParams => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  MERCADO_LIVRE_OAUTH_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  Object.entries(statusParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  window.history.replaceState({}, document.title, url.toString());
};

export default function MercadoLivreIntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {showError, showSuccess} = useToastMessage();

  const providerId = currentCompany?.id;
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
  const [authorizing, setAuthorizing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState(null);
  const oauthHandledRef = useRef(false);

  const loadPageData = useCallback(
    async ({showLoading = true} = {}) => {
      if (!providerId) {
        setDetail(null);
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const detailResponse = await api.fetch('/marketplace/integrations/mercadolivre/detail', {
          params: {
            provider_id: providerId,
          },
        });

        setDetail(detailResponse);

        const showcases = Array.isArray(detailResponse?.showcases)
          ? detailResponse.showcases
          : [];
        setSelectedShowcaseId(current => {
          if (current && showcases.some(showcase => String(showcase.id) === String(current))) {
            return current;
          }

          const preferred =
            showcases.find(showcase =>
              normalizeTextValue(showcase.domain).startsWith('loja.'),
            ) || showcases.find(showcase => showcase.integration_key === 'shop') || showcases[0];

          return preferred?.id || null;
        });
      } catch (error) {
        showError(formatApiError(error));
        setDetail(null);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [providerId, showError],
  );

  useFocusEffect(
    useCallback(() => {
      loadPageData();
    }, [loadPageData]),
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search || '');
    const alreadyConnected = params.get('mercadolivre_connected') === '1';
    const oauthStatusError = params.get('mercadolivre_error');
    const oauthError = params.get('error');
    const code = normalizeTextValue(params.get('code'));
    const state = normalizeTextValue(params.get('state'));

    if (alreadyConnected) {
      showSuccess('Mercado Livre conectado com sucesso.');
      replaceFrontOAuthStatus({});
      return;
    }

    if (oauthStatusError && !code && !state) {
      showError('Nao foi possivel conectar o Mercado Livre.');
      replaceFrontOAuthStatus({});
      return;
    }

    if ((!code && !state && !oauthError) || oauthHandledRef.current) {
      return;
    }

    oauthHandledRef.current = true;

    const finishOAuth = async () => {
      if (oauthError) {
        showError('Nao foi possivel conectar o Mercado Livre.');
        replaceFrontOAuthStatus({mercadolivre_error: oauthError});
        return;
      }

      const redirectUri = resolveFrontOAuthRedirectUri();
      if (!code || !state || !redirectUri) {
        showError('Retorno do Mercado Livre incompleto.');
        replaceFrontOAuthStatus({mercadolivre_error: 'missing_oauth_payload'});
        return;
      }

      setAuthorizing(true);
      try {
        const response = await api.fetch('/marketplace/integrations/mercadolivre/oauth/callback', {
          method: 'POST',
          body: {
            code,
            state,
            redirect_uri: redirectUri,
          },
        });

        if (response?.success === false) {
          throw response;
        }

        showSuccess('Mercado Livre conectado com sucesso.');
        replaceFrontOAuthStatus({mercadolivre_connected: '1'});
        await loadPageData({showLoading: false});
      } catch (error) {
        showError(formatApiError(error));
        replaceFrontOAuthStatus({
          mercadolivre_error: error?.error || 'oauth_failed',
        });
      } finally {
        setAuthorizing(false);
      }
    };

    finishOAuth();
  }, [loadPageData, showError, showSuccess]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPageData({showLoading: false});
    } finally {
      setRefreshing(false);
    }
  }, [loadPageData]);

  const connectMercadoLivre = useCallback(async () => {
    if (!providerId) {
      showError('Nao foi possivel identificar a empresa ativa.');
      return;
    }

    if (detail?.oauth?.client_configured === false) {
      showError('Configure o Client ID e Secret do app Mercado Livre antes de conectar.');
      return;
    }

    setAuthorizing(true);
    try {
      const response = await api.fetch('/marketplace/integrations/mercadolivre/authorization-page', {
        method: 'POST',
        body: {
          provider_id: providerId,
          return_url: resolveFrontOAuthRedirectUri(),
        },
      });

      const authorizationUrl =
        response?.authorization_url || response?.url || response?.auth_url || '';
      if (!authorizationUrl) {
        showError(response?.message || 'URL de autorizacao do Mercado Livre indisponivel.');
        return;
      }

      await Linking.openURL(authorizationUrl);
    } catch (error) {
      showError(error?.message || 'Nao foi possivel iniciar o login do Mercado Livre.');
    } finally {
      setAuthorizing(false);
    }
  }, [detail?.oauth?.client_configured, providerId, showError]);

  const importProducts = useCallback(async () => {
    if (!providerId || !selectedShowcaseId) {
      showError('Selecione a vitrine que recebera os produtos importados.');
      return;
    }

    setImporting(true);
    try {
      const response = await api.fetch('/marketplace/integrations/mercadolivre/products/import', {
        method: 'POST',
        body: {
          provider_id: providerId,
          showcase_id: selectedShowcaseId,
          limit: 50,
        },
      });

      showSuccess(
        `Importacao concluida: ${response?.imported_count || 0} novos e ${response?.updated_count || 0} atualizados.`,
      );
      await loadPageData({showLoading: false});
    } catch (error) {
      showError(error?.message || error?.error || 'Nao foi possivel importar os produtos.');
    } finally {
      setImporting(false);
    }
  }, [loadPageData, providerId, selectedShowcaseId, showError, showSuccess]);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            A integracao depende da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: brandColors.background}]} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={PROVIDER.accent} />
          <Text style={styles.centerStateTitle}>Carregando Mercado Livre</Text>
          <Text style={styles.centerStateText}>
            Buscando credenciais, webhook e vitrines disponiveis.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const integration = detail?.integration || {};
  const connected = isConnected(integration.connected);
  const oauthClientConfigured = detail?.oauth?.client_configured !== false;
  const statusTone = connected ? '#16A34A' : '#e67e22';
  const showcases = Array.isArray(detail?.showcases) ? detail.showcases : [];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: brandColors.background}]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PROVIDER.accent} />
        }>
        <View style={[styles.heroCard, shadowStyle, {backgroundColor: '#FFE600'}]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, {color: 'rgba(17,24,39,0.64)'}]}>INTEGRACAO</Text>
            <Text style={[styles.heroTitle, {color: '#111827'}]}>{PROVIDER.label}</Text>
            <Text style={[styles.heroText, {color: 'rgba(17,24,39,0.76)'}]}>
              Receba notificacoes de pedidos e importe anuncios para a vitrine escolhida.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name={PROVIDER.icon} size={22} color={PROVIDER.button} />
          </View>
        </View>

        <View style={[styles.statusCard, shadowStyle]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusCopy}>
              <Text style={styles.sectionTitle}>Status</Text>
              <Text style={styles.sectionSubtitle}>
                {integration.user_id
                  ? `Seller/User ID ${integration.user_id}`
                  : 'Conecte a conta vendedora para habilitar importacao e webhook.'}
              </Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: withOpacity(statusTone, 0.12)}]}>
              <Text style={[styles.statusBadgeText, {color: statusTone}]}>
                {connected ? 'Conectado' : 'Pendente'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>Conta Mercado Livre</Text>
          <Text style={styles.cardSubtitle}>
            {oauthClientConfigured
              ? 'O login abre o Mercado Livre, autoriza a conta vendedora e retorna para esta tela.'
              : 'Configure o Client ID e Secret do app Mercado Livre nesta empresa para habilitar o login.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {backgroundColor: PROVIDER.button},
              (!oauthClientConfigured || authorizing) && styles.saveButtonDisabled,
            ]}
            disabled={!oauthClientConfigured || authorizing}
            activeOpacity={0.9}
            onPress={connectMercadoLivre}>
            {authorizing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="external-link" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {connected ? 'Reconectar Mercado Livre' : 'Conectar com Mercado Livre'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>Webhook</Text>
          <Text style={styles.cardSubtitle}>{detail?.webhook?.url || 'Webhook indisponivel.'}</Text>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>Importar produtos</Text>
          <Text style={styles.cardSubtitle}>
            Selecione a vitrine que recebera os produtos importados do Mercado Livre.
          </Text>

          <View style={styles.fieldList}>
            {showcases.length === 0 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nenhuma vitrine ativa encontrada</Text>
                <Text style={styles.fieldKey}>
                  Crie ou ative uma vitrine antes de importar produtos.
                </Text>
              </View>
            ) : (
              showcases.map(showcase => {
                const selected = String(showcase.id) === String(selectedShowcaseId);
                return (
                  <TouchableOpacity
                    key={showcase.id}
                    activeOpacity={0.88}
                    onPress={() => setSelectedShowcaseId(showcase.id)}
                    style={[
                      styles.input,
                      {
                        borderColor: selected ? PROVIDER.button : '#E2E8F0',
                        backgroundColor: selected ? withOpacity('#FFE600', 0.22) : '#F8FAFC',
                      },
                    ]}>
                    <Text style={styles.fieldLabel}>{showcase.name}</Text>
                    <Text style={styles.fieldKey}>
                      {showcase.domain || showcase.integration_key || 'Vitrine sem dominio'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {backgroundColor: PROVIDER.button},
              (!selectedShowcaseId || importing) && styles.saveButtonDisabled,
            ]}
            disabled={!selectedShowcaseId || importing}
            activeOpacity={0.9}
            onPress={importProducts}>
            {importing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="download-cloud" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>Importar para a vitrine</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

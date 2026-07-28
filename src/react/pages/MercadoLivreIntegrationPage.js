import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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
  requiredKeys: ['mercado-livre-user-id', 'mercado-livre-access-token'],
  fields: [
    {
      key: 'mercado-livre-user-id',
      label: 'Seller/User ID',
      placeholder: 'Informe o user id da conta Mercado Livre',
    },
    {
      key: 'mercado-livre-access-token',
      label: 'Access token',
      placeholder: 'Informe o access token',
      secureTextEntry: true,
    },
    {
      key: 'mercado-livre-refresh-token',
      label: 'Refresh token',
      placeholder: 'Informe o refresh token, se disponivel',
      secureTextEntry: true,
    },
  ],
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

const normalizeSourceConfigs = source => {
  if (Array.isArray(source)) {
    return source.reduce((accumulator, item) => {
      const key = normalizeTextValue(item?.configKey);
      if (key) {
        accumulator[key] = item?.configValue;
      }
      return accumulator;
    }, {});
  }

  return source && typeof source === 'object' ? source : {};
};

const parseStoredValue = value => {
  const normalized = normalizeTextValue(value);
  if (!normalized) {
    return '';
  }

  try {
    const decoded = JSON.parse(normalized);
    return typeof decoded === 'string' || typeof decoded === 'number'
      ? String(decoded)
      : normalized;
  } catch {
    return normalized;
  }
};

const toConfigRequestValue = value => JSON.stringify(normalizeTextValue(value));

const buildFieldValues = source => {
  const sourceMap = normalizeSourceConfigs(source);

  return PROVIDER.fields.reduce((accumulator, field) => {
    accumulator[field.key] = parseStoredValue(sourceMap[field.key]);
    return accumulator;
  }, {});
};

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

export default function MercadoLivreIntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const configsStore = useStore('configs');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {showError, showSuccess} = useToastMessage();
  const configActions = configsStore.actions;
  const {isSaving} = configsStore.getters;

  const providerId = currentCompany?.id;
  const providerIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );
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
  const [importing, setImporting] = useState(false);
  const [configValues, setConfigValues] = useState({});
  const [detail, setDetail] = useState(null);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState(null);

  useEffect(() => {
    setConfigValues(buildFieldValues(currentCompany?.configs));
  }, [currentCompany?.configs]);

  const loadPageData = useCallback(
    async ({showLoading = true} = {}) => {
      if (!providerId || !providerIri) {
        setDetail(null);
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const [configResponse, detailResponse] = await Promise.all([
          api.fetch('/configs', {
            params: {
              people: providerIri,
            },
          }),
          api.fetch('/marketplace/integrations/mercadolivre/detail', {
            params: {
              provider_id: providerId,
            },
          }),
        ]);

        setConfigValues(buildFieldValues(configResponse?.member || configResponse));
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
    [providerId, providerIri, showError],
  );

  useFocusEffect(
    useCallback(() => {
      loadPageData();
    }, [loadPageData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPageData({showLoading: false});
    } finally {
      setRefreshing(false);
    }
  }, [loadPageData]);

  const updateField = useCallback((fieldKey, value) => {
    setConfigValues(currentValues => ({
      ...currentValues,
      [fieldKey]: value,
    }));
  }, []);

  const saveIntegration = useCallback(async () => {
    if (!providerIri) {
      showError('Nao foi possivel identificar a empresa ativa.');
      return;
    }

    const configs = PROVIDER.fields.map(field => ({
      configKey: field.key,
      configValue: toConfigRequestValue(configValues[field.key]),
    }));

    try {
      await configActions.addManyConfigs({
        configs,
        people: providerIri,
        module: 4,
        visibility: 'private',
      });

      showSuccess('Mercado Livre salvo com sucesso.');
      await loadPageData({showLoading: false});
    } catch (error) {
      showError(error?.message || 'Nao foi possivel salvar a integracao Mercado Livre.');
    }
  }, [
    configActions,
    configValues,
    loadPageData,
    providerIri,
    showError,
    showSuccess,
  ]);

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
                  : 'Salve o token e o user id para habilitar importacao e webhook.'}
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
          <Text style={styles.cardTitle}>Credenciais</Text>
          <Text style={styles.cardSubtitle}>
            Use as credenciais da conta vendedora que sera vinculada a empresa ativa.
          </Text>

          <View style={styles.fieldList}>
            {PROVIDER.fields.map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldKey}>{field.key}</Text>
                <TextInput
                  style={[styles.input, isSaving && styles.inputDisabled]}
                  value={configValues[field.key] || ''}
                  onChangeText={value => updateField(field.key, value)}
                  editable={!isSaving}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={Boolean(field.secureTextEntry)}
                  placeholder={field.placeholder}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {backgroundColor: PROVIDER.button},
              isSaving && styles.saveButtonDisabled,
            ]}
            disabled={isSaving}
            activeOpacity={0.9}
            onPress={saveIntegration}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="save" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>Salvar Mercado Livre</Text>
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

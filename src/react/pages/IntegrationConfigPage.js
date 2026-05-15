import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

import {
  getIntegrationConfig,
  getIntegrationByKey,
  parseIntegrationCollection,
} from './integrationsCatalog';
import styles from './IntegrationConfigPage.styles';

const ROUTE_PROVIDER_MAP = {
  UberIntegrationPage: 'uber',
  AsaasIntegrationPage: 'asaas',
  ClickSignIntegrationPage: 'clicksign',
};

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

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar a configuracao da integracao.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar a configuracao da integracao.';
};

const normalizeSourceConfigs = source => {
  if (Array.isArray(source)) {
    return source.reduce((accumulator, item) => {
      const key = String(item?.configKey || '').trim();
      if (key) {
        accumulator[key] = item?.configValue;
      }
      return accumulator;
    }, {});
  }

  if (source && typeof source === 'object') {
    return source;
  }

  return {};
};

const normalizeTextValue = value => String(value ?? '').trim();

const toConfigRequestValue = value => {
  if (value === undefined) {
    return JSON.stringify('');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed === '') {
      return JSON.stringify('');
    }

    try {
      JSON.parse(trimmed);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
};

const buildFieldValues = (providerConfig, source) => {
  const sourceMap = normalizeSourceConfigs(source);

  return (providerConfig?.fields || []).reduce((accumulator, field) => {
    accumulator[field.key] = normalizeTextValue(sourceMap[field.key]);
    return accumulator;
  }, {});
};

export default function IntegrationConfigPage({ route }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const configsStore = useStore('configs');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const configActions = configsStore.actions;
  const { isSaving } = configsStore.getters;
  const { showError, showSuccess } = useToastMessage();

  const providerKey = useMemo(
    () =>
      route?.params?.providerKey ||
      ROUTE_PROVIDER_MAP[route?.name] ||
      '',
    [route?.name, route?.params?.providerKey],
  );
  const providerConfig = useMemo(
    () => getIntegrationConfig(providerKey),
    [providerKey],
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
  const [configValues, setConfigValues] = useState({});
  const [integrationSummary, setIntegrationSummary] = useState(null);

  const providerId = currentCompany?.id;
  const providerIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );

  const syncConfigValues = useCallback(
    source => {
      if (!providerConfig) {
        setConfigValues({});
        return;
      }

      setConfigValues(buildFieldValues(providerConfig, source));
    },
    [providerConfig],
  );

  useEffect(() => {
    syncConfigValues(currentCompany?.configs);
  }, [currentCompany?.configs, syncConfigValues]);

  const loadPageData = useCallback(async ({ showLoading = true } = {}) => {
    if (!providerIri || !providerConfig) {
      setIntegrationSummary(null);
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }

    try {
      const [configResponse, integrationResponse] = await Promise.all([
        api.fetch('/configs', {
          params: {
            people: providerIri,
          },
        }),
        api.fetch('/marketplace/integrations', {
          params: {
            provider_id: providerId,
          },
        }),
      ]);

      syncConfigValues(parseIntegrationCollection(configResponse));
      setIntegrationSummary(
        getIntegrationByKey(integrationResponse, providerConfig.key),
      );
    } catch (error) {
      showError(formatApiError(error));
      syncConfigValues(currentCompany?.configs);
      setIntegrationSummary(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [
    currentCompany?.configs,
    providerConfig,
    providerIri,
    providerId,
    showError,
    syncConfigValues,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadPageData();
    }, [loadPageData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPageData({ showLoading: false });
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

  const requiredKeys = providerConfig?.requiredKeys || [];
  const connected = typeof integrationSummary?.connected === 'boolean'
    ? Boolean(integrationSummary.connected)
    : requiredKeys.length > 0
      ? requiredKeys.every(fieldKey => normalizeTextValue(configValues[fieldKey]) !== '')
      : false;
  const statusTone = connected ? '#16A34A' : '#F59E0B';
  const statusText = connected ? 'Conectado' : 'Pendente';
  const editable = Boolean(providerIri && providerConfig && !isSaving && !loading);

  const saveIntegration = useCallback(async () => {
    if (!providerIri || !providerConfig) {
      showError('Nao foi possivel identificar a integracao selecionada.');
      return;
    }

    const configs = (providerConfig.fields || []).map(field => ({
      configKey: field.key,
      configValue: toConfigRequestValue(normalizeTextValue(configValues[field.key])),
    }));

    try {
      await configActions.addManyConfigs({
        configs,
        people: providerIri,
        module: 4,
        visibility: 'public',
      });

      showSuccess(`${providerConfig.label} salvo com sucesso.`);
      await loadPageData({ showLoading: false });
    } catch (error) {
      showError(error?.message || 'Nao foi possivel salvar a integracao.');
    }
  }, [
    configActions,
    configValues,
    loadPageData,
    providerConfig,
    providerIri,
    showError,
    showSuccess,
  ]);

  if (!providerConfig) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="alert-triangle" size={32} color="#F59E0B" />
          <Text style={styles.centerStateTitle}>Integracao indisponivel</Text>
          <Text style={styles.centerStateText}>
            A tela solicitada nao possui configuracao cadastrada.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            A configuracao da integracao depende da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={providerConfig.accent} />
          <Text style={styles.centerStateTitle}>Carregando integracao</Text>
          <Text style={styles.centerStateText}>
            Buscando as credenciais salvas para a empresa ativa.
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={providerConfig.accent} />
        }>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: providerConfig.accent }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>INTEGRACAO</Text>
            <Text style={styles.heroTitle}>{providerConfig.label}</Text>
            <Text style={styles.heroText}>
              {providerConfig.description}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name={providerConfig.icon} size={22} color={providerConfig.accent} />
          </View>
        </View>

        <View style={[styles.statusCard, shadowStyle]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusCopy}>
              <Text style={styles.sectionTitle}>Status</Text>
              <Text style={styles.sectionSubtitle}>
                A integracao so aparece como conectada quando todos os campos
                obrigatorios foram salvos na empresa ativa.
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: withOpacity(statusTone, 0.12) },
              ]}>
              <Text style={[styles.statusBadgeText, { color: statusTone }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>Credenciais</Text>
          <Text style={styles.cardSubtitle}>
            Salve as credenciais na empresa ativa. O hub de integracoes volta a
            mostrar o status correto quando voce retornar para a lista.
          </Text>

          <View style={styles.fieldList}>
            {providerConfig.fields.map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldKey}>{field.key}</Text>
                <TextInput
                  style={[
                    styles.input,
                    !editable && styles.inputDisabled,
                  ]}
                  value={configValues[field.key] || ''}
                  onChangeText={value => updateField(field.key, value)}
                  editable={editable}
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
              { backgroundColor: providerConfig.accent },
              !editable && styles.saveButtonDisabled,
            ]}
            disabled={!editable}
            activeOpacity={0.9}
            onPress={saveIntegration}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="save" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {providerConfig.saveLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

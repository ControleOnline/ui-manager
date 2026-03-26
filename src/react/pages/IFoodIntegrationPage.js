import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar os dados da integracao iFood.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar os dados da integracao iFood.';
};

export default function IFoodIntegrationPage() {
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

  const providerId = currentCompany?.id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [detail, setDetail] = useState(null);
  const [merchantIdInput, setMerchantIdInput] = useState('');

  const applyDetailResponse = useCallback(response => {
    setDetail(response || null);
    const integrationMerchantId = String(
      response?.integration?.merchant_id
      || response?.integration?.ifood_code
      || response?.selected_store?.merchant_id
      || '',
    );
    if (integrationMerchantId !== '') {
      setMerchantIdInput(integrationMerchantId);
    }
  }, []);

  const loadDetail = useCallback(async ({ refreshRemote = false } = {}) => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    try {
      const params = { provider_id: providerId };
      if (refreshRemote) {
        params.refresh_remote = 1;
      }

      const response = await api.fetch('/marketplace/integrations/ifood/detail', {
        params,
      });
      applyDetailResponse(response);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [applyDetailResponse, providerId, showError]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDetail({ refreshRemote: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail]);

  const withAction = useCallback(async (actionName, callback) => {
    setActionLoading(actionName);
    try {
      await callback();
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!providerId) {
      return;
    }

    await withAction('sync', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/sync', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: providerId,
          }),
        });
        applyDetailResponse(response);
        showInfo('Estado da integracao iFood sincronizado.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleConnect = useCallback(async () => {
    if (!providerId) {
      return;
    }

    const merchantId = String(merchantIdInput || '').trim();
    if (!merchantId) {
      showInfo('Informe o merchant_id da loja iFood para conectar.');
      return;
    }

    await withAction('connect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/connect', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: providerId,
            merchant_id: merchantId,
          }),
        });
        applyDetailResponse(response);
        showInfo('Loja iFood conectada com sucesso.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [applyDetailResponse, merchantIdInput, providerId, showError, showInfo, withAction]);

  const handleDisconnect = useCallback(async () => {
    if (!providerId) {
      return;
    }

    await withAction('disconnect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/disconnect', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: providerId,
          }),
        });
        applyDetailResponse(response);
        setMerchantIdInput('');
        showInfo('Loja iFood desconectada.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa ativa</Text>
          <Text style={styles.centerStateText}>
            A integracao iFood precisa de uma empresa ativa para carregar os dados.
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
          <Text style={styles.centerStateTitle}>Carregando integracao iFood</Text>
          <Text style={styles.centerStateText}>
            Buscando dados da loja e estado atual da conexao.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const integration = detail?.integration || {};
  const stores = Array.isArray(detail?.stores?.items) ? detail.stores.items : [];
  const selectedStore = detail?.selected_store || stores.find(
    store => String(store?.merchant_id || '') === String(integration?.merchant_id || ''),
  );
  const connected = Boolean(integration?.connected);
  const remoteConnected = Boolean(integration?.remote_connected);
  const authAvailable = Boolean(integration?.auth_available);
  const statusTone = connected ? '#16A34A' : '#F59E0B';
  const statusText = connected ? 'Conectada' : 'Pendente';
  const logo = getOrderChannelLogo({ app: 'iFood' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary}
          />
        )}>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>MARKETPLACE</Text>
            <Text style={styles.heroTitle}>Integracao iFood</Text>
            <Text style={styles.heroText}>
              Gerencie vinculacao da loja, sincronizacao e monitoramento remoto.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            {logo ? (
              <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
            ) : (
              <Icon name="shopping-bag" size={20} color={brandColors.primary} />
            )}
          </View>
        </View>

        <View style={[styles.sectionCard, shadowStyle]}>
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>Status da integracao</Text>
            <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusTone, 0.12) }]}>
              <Text style={[styles.statusBadgeText, { color: statusTone }]}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Loja vinculada</Text>
              <Text style={styles.metaValue}>
                {integration?.merchant_name || integration?.merchant_id || 'Nao vinculada'}
              </Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Status remoto</Text>
              <Text style={styles.metaValue}>
                {integration?.merchant_status_label || 'Indefinido'}
              </Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Token OAuth</Text>
              <Text style={styles.metaValue}>{authAvailable ? 'Disponivel' : 'Indisponivel'}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Produtos aptos</Text>
              <Text style={styles.metaValue}>{integration?.eligible_product_count || 0}</Text>
            </View>
          </View>

          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              {remoteConnected
                ? 'A vinculacao local esta confirmada na conta iFood.'
                : connected
                  ? 'Loja vinculada localmente. Execute sincronizacao para validar no iFood.'
                  : 'Selecione ou informe o merchant_id para conectar a loja.'}
            </Text>
          </View>

          {!!integration?.last_error_message && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Ultimo erro</Text>
              <Text style={styles.errorText}>{integration.last_error_message}</Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, shadowStyle]}>
          <Text style={styles.sectionTitle}>Lojas disponiveis no iFood</Text>

          {stores.length > 0 ? (
            <View style={styles.storesList}>
              {stores.map(store => {
                const storeMerchantId = String(store?.merchant_id || '');
                const selected = storeMerchantId !== '' && storeMerchantId === merchantIdInput;
                return (
                  <TouchableOpacity
                    key={storeMerchantId}
                    activeOpacity={0.9}
                    style={[
                      styles.storeCard,
                      selected && styles.storeCardSelected,
                    ]}
                    onPress={() => setMerchantIdInput(storeMerchantId)}>
                    <View style={styles.storeTop}>
                      <Text style={styles.storeName}>{store?.name || `Loja ${storeMerchantId}`}</Text>
                      <View style={[
                        styles.storeStatusChip,
                        { backgroundColor: withOpacity(store?.status === 'AVAILABLE' ? '#16A34A' : '#64748B', 0.14) },
                      ]}>
                        <Text style={[
                          styles.storeStatusText,
                          { color: store?.status === 'AVAILABLE' ? '#166534' : '#334155' },
                        ]}>
                          {store?.status_label || 'Indefinido'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.storeCode}>merchant_id: {storeMerchantId}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyStores}>
              <Text style={styles.emptyStoresText}>
                Nenhuma loja retornada pela API iFood. Voce ainda pode conectar manualmente por merchant_id.
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>merchant_id para vinculacao</Text>
          <TextInput
            value={merchantIdInput}
            onChangeText={setMerchantIdInput}
            placeholder="Ex.: c1111111-aaaa-bbbb-cccc-222222222222"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionButton, { backgroundColor: brandColors.primary }]}
              onPress={handleConnect}
              disabled={actionLoading !== null}>
              {actionLoading === 'connect' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="link" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Conectar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionButtonSecondary, !connected && styles.actionButtonSecondaryDisabled]}
              onPress={handleDisconnect}
              disabled={actionLoading !== null || !connected}>
              {actionLoading === 'disconnect' ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <>
                  <Icon name="x-circle" size={16} color="#EF4444" />
                  <Text style={styles.actionButtonSecondaryText}>Desconectar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.syncButton, { borderColor: brandColors.primary }]}
            onPress={handleSync}
            disabled={actionLoading !== null}>
            {actionLoading === 'sync' ? (
              <ActivityIndicator color={brandColors.primary} size="small" />
            ) : (
              <>
                <Icon name="refresh-cw" size={16} color={brandColors.primary} />
                <Text style={[styles.syncButtonText, { color: brandColors.primary }]}>Sincronizar estado remoto</Text>
              </>
            )}
          </TouchableOpacity>

          {!!selectedStore && (
            <View style={styles.selectedStoreBox}>
              <Text style={styles.selectedStoreTitle}>Loja selecionada</Text>
              <Text style={styles.selectedStoreText}>{selectedStore?.name || 'Sem nome'}</Text>
              <Text style={styles.selectedStoreText}>merchant_id: {selectedStore?.merchant_id}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  centerStateTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerStateText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 16,
  },
  heroEyebrow: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroText: {
    color: '#DBEAFE',
    fontSize: 13,
    lineHeight: 18,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 24,
    height: 24,
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  helperRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  helperText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  errorTitle: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 16,
  },
  storesList: {
    gap: 8,
  },
  storeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  storeCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#EFF6FF',
  },
  storeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeName: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  storeStatusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  storeStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  storeCode: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStores: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyStoresText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSecondaryDisabled: {
    opacity: 0.5,
  },
  actionButtonSecondaryText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  syncButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedStoreBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  selectedStoreTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  selectedStoreText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
});

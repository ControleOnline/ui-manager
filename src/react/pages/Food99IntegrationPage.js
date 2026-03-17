
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

const MINIMUM_REQUIRED_ITEMS = 5;

const statusLabelMap = {
  1: 'Online',
  2: 'Offline',
};

const subStatusLabelMap = {
  1: 'Pronta',
  2: 'Pausada',
  3: 'Fechada',
};

const filterTabs = [
  { key: 'all', label: 'Todos' },
  { key: 'eligible', label: 'Elegiveis' },
  { key: 'selected', label: 'Selecionados' },
  { key: 'blocked', label: 'Com bloqueio' },
];

const publishStateLabelMap = {
  submitted: 'Enviado',
  processing: 'Processando',
  published: 'Publicado',
  failed: 'Falhou',
  sync_error: 'Sync pendente',
};

const publishStateToneMap = {
  submitted: '#2563EB',
  processing: '#F59E0B',
  published: '#16A34A',
  failed: '#DC2626',
  sync_error: '#7C3AED',
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
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }
  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel concluir a operacao.'
  );
};

const countCollection = collection => (Array.isArray(collection) ? collection.length : 0);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalizeTaskId = value => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

const getPublishStateLabel = state =>
  publishStateLabelMap[state] || 'Sem envio recente';

const createEmptyStoreSettingsDraft = () => ({
  deliveryRadiusKm: '',
  openTime: '',
  closeTime: '',
  deliveryMethod: '',
  confirmMethod: '',
  deliveryAreaId: '',
});

const isErrnoSuccess = errno => String(errno ?? '').trim() === '0';

export default function Food99IntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showInfo, showSuccess } = useToastMessage();

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
  const [search, setSearch] = useState('');
  const [filterKey, setFilterKey] = useState('all');
  const [integrationItem, setIntegrationItem] = useState(null);
  const [productsResponse, setProductsResponse] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [lastUploadResult, setLastUploadResult] = useState(null);
  const [storeSettingsResponse, setStoreSettingsResponse] = useState(null);
  const [storeSettingsDraft, setStoreSettingsDraft] = useState(createEmptyStoreSettingsDraft);
  const [manualShopId, setManualShopId] = useState('');
  const hasHydratedSelection = useRef(false);

  const providerId = currentCompany?.id;

  const products = useMemo(
    () => (Array.isArray(productsResponse?.products) ? productsResponse.products : []),
    [productsResponse],
  );

  const selectedProductSet = useMemo(
    () => new Set(selectedProductIds.map(id => String(id))),
    [selectedProductIds],
  );

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach(product => {
      map.set(String(product.id), product);
    });
    return map;
  }, [products]);

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map(id => productMap.get(String(id)))
        .filter(Boolean),
    [productMap, selectedProductIds],
  );

  const selectedEligibleProducts = useMemo(
    () => selectedProducts.filter(product => product.eligible),
    [selectedProducts],
  );

  const connected = Boolean(integrationItem?.connected);
  const remoteConnected = Boolean(integrationItem?.remote_connected);
  const storeBizStatus = Number(integrationItem?.biz_status ?? 0);
  const storeSubStatus = Number(integrationItem?.sub_biz_status ?? 0);
  const isOnline = Boolean(integrationItem?.online);
  const menuCount = Number(integrationItem?.menu_count || 0);
  const menuItemCount = Number(integrationItem?.menu_item_count || 0);
  const deliveryAreaCount = Number(integrationItem?.delivery_area_count || 0);
  const publishedProductCount = Number(integrationItem?.published_product_count || 0);
  const remoteOnlyItemCount = Number(integrationItem?.remote_only_item_count || 0);
  const lastSyncAt = integrationItem?.last_sync_at || null;
  const lastErrorMessage = integrationItem?.last_error_message || null;
  const lastMenuTaskId =
    normalizeTaskId(integrationItem?.last_menu_task_id) ||
    normalizeTaskId(lastUploadResult?.integration?.last_menu_task_id) ||
    normalizeTaskId(lastUploadResult?.result?.data?.taskID) ||
    normalizeTaskId(lastUploadResult?.result?.data?.taskId) ||
    null;
  const lastMenuTaskStatus = integrationItem?.last_menu_task_status || null;
  const lastMenuTaskMessage = integrationItem?.last_menu_task_message || null;
  const lastMenuTaskCheckedAt = integrationItem?.last_menu_task_checked_at || null;
  const lastMenuPublishState = integrationItem?.last_menu_publish_state || null;
  const lastReconcileAt = integrationItem?.last_reconcile_at || null;
  const lastWebhookReceivedAt = integrationItem?.last_webhook_received_at || null;
  const publicationTone = publishStateToneMap[lastMenuPublishState] || '#64748B';
  const storeSettings = storeSettingsResponse?.settings || {};
  const resolveSettingDisplay = value =>
    value === null || value === undefined || String(value).trim() === '' ? '-' : String(value);
  const currentDeliveryRadius = resolveSettingDisplay(storeSettings?.delivery_radius);
  const currentOpenTime = resolveSettingDisplay(storeSettings?.open_time);
  const currentCloseTime = resolveSettingDisplay(storeSettings?.close_time);
  const currentDeliveryMethod = resolveSettingDisplay(storeSettings?.delivery_method);
  const currentConfirmMethod = resolveSettingDisplay(storeSettings?.confirm_method);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = String(search || '').trim().toLowerCase();

    return products.filter(product => {
      if (filterKey === 'eligible' && !product.eligible) return false;
      if (filterKey === 'blocked' && product.eligible) return false;
      if (filterKey === 'selected' && !selectedProductSet.has(String(product.id))) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        product.name,
        product.description,
        product.category?.name,
        product.food99_code,
        product.suggested_app_item_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [filterKey, products, search, selectedProductSet]);

  const summaryCards = useMemo(
    () => [
      {
        key: 'connection',
        label: 'Loja 99',
        value: connected ? 'Conectada' : 'Pendente',
        icon: 'link',
        color: connected ? '#10B981' : '#F59E0B',
      },
      {
        key: 'status',
        label: 'Status',
        value: remoteConnected
          ? integrationItem?.biz_status_label || statusLabelMap[storeBizStatus] || 'Indefinido'
          : connected
            ? 'Aguardando sync'
            : 'Pendente',
        icon: isOnline ? 'wifi' : 'wifi-off',
        color: isOnline ? brandColors.primary : '#64748B',
      },
      {
        key: 'eligible',
        label: 'Produtos locais aptos',
        value: String(productsResponse?.eligible_product_count || 0),
        icon: 'package',
        color: '#3B82F6',
      },
      {
        key: 'selected',
        label: 'Selecionados',
        value: String(selectedEligibleProducts.length),
        icon: 'check-circle',
        color: selectedEligibleProducts.length >= MINIMUM_REQUIRED_ITEMS ? '#10B981' : '#F59E0B',
      },
    ],
    [
      brandColors.primary,
      connected,
      remoteConnected,
      integrationItem?.biz_status_label,
      isOnline,
      productsResponse?.eligible_product_count,
      storeBizStatus,
      selectedEligibleProducts.length,
    ],
  );

  const hydrateSelection = useCallback(productList => {
    if (hasHydratedSelection.current) {
      return;
    }

    const preselected = productList
      .filter(product => {
        if (!product?.eligible) return false;
        return Boolean(product.published_remotely);
      })
      .map(product => String(product.id));

    if (preselected.length > 0) {
      setSelectedProductIds(preselected);
    }

    hasHydratedSelection.current = true;
  }, []);

  const syncSelectionWithPublishedProducts = useCallback(productList => {
    const publishedIds = (Array.isArray(productList) ? productList : [])
      .filter(product => product?.eligible && product?.published_remotely)
      .map(product => String(product.id));

    setSelectedProductIds(publishedIds);
    hasHydratedSelection.current = true;
  }, []);

  const applyDetailResponse = useCallback(
    (detailResponse, { syncPublishedSelection = false } = {}) => {
      setIntegrationItem(detailResponse?.integration || null);
      setProductsResponse(detailResponse?.products || null);
      if (syncPublishedSelection) {
        syncSelectionWithPublishedProducts(detailResponse?.products?.products || []);
      } else {
        hydrateSelection(detailResponse?.products?.products || []);
      }
    },
    [hydrateSelection, syncSelectionWithPublishedProducts],
  );

  const applyStoreSettingsResponse = useCallback(response => {
    const settings = response?.settings || {};

    setStoreSettingsResponse(response || null);
    setStoreSettingsDraft({
      deliveryRadiusKm:
        settings?.delivery_radius === null || settings?.delivery_radius === undefined
          ? ''
          : String(settings.delivery_radius),
      openTime: settings?.open_time ? String(settings.open_time) : '',
      closeTime: settings?.close_time ? String(settings.close_time) : '',
      deliveryMethod: settings?.delivery_method ? String(settings.delivery_method) : '',
      confirmMethod: settings?.confirm_method ? String(settings.confirm_method) : '',
      deliveryAreaId: settings?.delivery_area_id ? String(settings.delivery_area_id) : '',
    });
  }, []);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!providerId) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const [detailResponse, settingsResponse] = await Promise.all([
          api.fetch('/marketplace/integrations/99food/detail', {
            params: { provider_id: providerId, refresh_remote: 1 },
          }),
          api.fetch('/marketplace/integrations/99food/store/settings', {
            params: { provider_id: providerId },
          }),
        ]);

        applyDetailResponse(detailResponse);
        applyStoreSettingsResponse(settingsResponse);
      } catch (error) {
        showError(formatApiError(error));
      } finally {
        setLoading(false);
      }
    },
    [applyDetailResponse, applyStoreSettingsResponse, providerId, showError],
  );

  const fetchMenuTaskStatus = useCallback(
    async (taskId, { poll = false } = {}) => {
      if (!providerId || !taskId) {
        return null;
      }

      let lastResponse = null;
      const maxAttempts = poll ? 6 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await api.fetch(`/marketplace/integrations/99food/menu/task/${taskId}`, {
          params: { provider_id: providerId },
        });

        lastResponse = response;

        if (response?.integration || response?.products) {
          applyDetailResponse(
            {
              integration: response?.integration,
              products: response?.products,
            },
            {
              syncPublishedSelection: response?.publish_state === 'published',
            },
          );
        } else {
          await loadData({ silent: true });
        }

        if (['published', 'failed', 'sync_error'].includes(response?.publish_state)) {
          break;
        }

        if (!poll || attempt === maxAttempts - 1) {
          break;
        }

        await wait(3000);
      }

      return lastResponse;
    },
    [applyDetailResponse, loadData, providerId],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (lastMenuTaskId) {
        await fetchMenuTaskStatus(lastMenuTaskId, { poll: false });
      } else {
        await loadData({ silent: true });
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setRefreshing(false);
    }
  }, [fetchMenuTaskStatus, lastMenuTaskId, loadData, showError]);

  const withAction = useCallback(
    async (key, action) => {
      setActionLoading(key);
      try {
        await action();
      } finally {
        setActionLoading('');
      }
    },
    [],
  );

  const handleToggleProduct = useCallback(
    product => {
      if (!product?.eligible) {
        showError(product?.blockers?.[0] || 'Produto indisponivel para a integracao.');
        return;
      }

      setSelectedProductIds(currentIds => {
        const productId = String(product.id);
        if (currentIds.includes(productId)) {
          return currentIds.filter(id => id !== productId);
        }

        return [...currentIds, productId];
      });
    },
    [showError],
  );

  const handleConnectStore = useCallback(async () => {
    if (!providerId) return;

    await withAction('connect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/99food/store/authorization-page', {
          method: 'POST',
          body: { provider_id: providerId },
        });

        const authUrl =
          response?.data?.url ||
          response?.data?.auth_url ||
          response?.data?.authorization_url ||
          response?.data?.authorization_page ||
          response?.data?.web_page_url ||
          null;

        if (authUrl) {
          await Linking.openURL(authUrl);
          showInfo('Abrindo fluxo de integracao da loja.');
          return;
        }

        if (isErrnoSuccess(response?.errno)) {
          showSuccess('Solicitacao de integracao enviada.');
          return;
        }

        showError(response?.errmsg || 'Nao foi possivel iniciar a integracao da loja.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [providerId, showError, showInfo, showSuccess, withAction]);

  const handleStoreStatusChange = useCallback(
    async nextStatus => {
      if (!providerId) return;

      await withAction(nextStatus === 1 ? 'online' : 'offline', async () => {
        try {
          const response = await api.fetch('/marketplace/integrations/99food/store/status', {
            method: 'POST',
            body: {
              provider_id: providerId,
              biz_status: nextStatus,
              auto_switch: 2,
            },
          });

          if (!isErrnoSuccess(response?.errno)) {
            showError(response?.errmsg || 'Nao foi possivel atualizar o status da loja.');
            return;
          }

          showSuccess(nextStatus === 1 ? 'Loja enviada para online.' : 'Loja enviada para offline.');
          await loadData({ silent: true });
        } catch (error) {
          showError(formatApiError(error));
        }
      });
    },
    [loadData, providerId, showError, showSuccess, withAction],
  );

  const getFirstOperationError = useCallback(response => {
    if (!response || typeof response !== 'object') {
      return null;
    }

    if (response?.result && !isErrnoSuccess(response.result?.errno)) {
      return response.result?.errmsg || 'A operacao falhou na 99Food.';
    }

    const operations = response?.operations || {};
    for (const operationKey of Object.keys(operations)) {
      const operationResult = operations?.[operationKey];
      if (!isErrnoSuccess(operationResult?.errno)) {
        return operationResult?.errmsg || `Falha em ${operationKey}.`;
      }
    }

    return null;
  }, []);

  const handleSaveStoreSettings = useCallback(async () => {
    if (!providerId) return;

    await withAction('save-settings', async () => {
      try {
        const payload = {
          provider_id: providerId,
        };

        if (storeSettingsDraft?.deliveryRadiusKm?.trim()) {
          payload.delivery_radius_km = storeSettingsDraft.deliveryRadiusKm.trim();
        }

        if (storeSettingsDraft?.openTime?.trim()) {
          payload.open_time = storeSettingsDraft.openTime.trim();
        }

        if (storeSettingsDraft?.closeTime?.trim()) {
          payload.close_time = storeSettingsDraft.closeTime.trim();
        }

        if (storeSettingsDraft?.deliveryMethod?.trim()) {
          payload.delivery_method = storeSettingsDraft.deliveryMethod.trim();
        }

        if (storeSettingsDraft?.confirmMethod?.trim()) {
          payload.confirm_method = storeSettingsDraft.confirmMethod.trim();
        }

        if (storeSettingsDraft?.deliveryAreaId?.trim()) {
          payload.delivery_area_id = storeSettingsDraft.deliveryAreaId.trim();
        }

        const response = await api.fetch('/marketplace/integrations/99food/store/settings', {
          method: 'POST',
          body: payload,
        });

        const operationError = getFirstOperationError(response);
        if (response?.error || operationError) {
          showError(response?.error || operationError || 'Nao foi possivel salvar as configuracoes.');
          return;
        }

        applyStoreSettingsResponse(response);
        await loadData({ silent: true });
        showSuccess('Configuracoes da loja atualizadas.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [
    applyStoreSettingsResponse,
    getFirstOperationError,
    loadData,
    providerId,
    showError,
    showSuccess,
    storeSettingsDraft,
    withAction,
  ]);

  const handleManualBindStore = useCallback(async () => {
    if (!providerId) return;

    const shopId = String(manualShopId || '').trim();
    if (!shopId) {
      showError('Informe o shop_id para vincular a loja.');
      return;
    }

    await withAction('bind-manual', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/99food/store/connect', {
          method: 'POST',
          body: {
            provider_id: providerId,
            shop_id: shopId,
          },
        });

        const operationError = getFirstOperationError(response);
        if (response?.error || operationError) {
          showError(response?.error || operationError || 'Nao foi possivel vincular a loja.');
          return;
        }

        applyStoreSettingsResponse(response);
        await loadData({ silent: true });
        showSuccess('Loja vinculada manualmente com sucesso.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [
    applyStoreSettingsResponse,
    getFirstOperationError,
    loadData,
    manualShopId,
    providerId,
    showError,
    showSuccess,
    withAction,
  ]);

  const handleDisconnectStore = useCallback(async () => {
    if (!providerId) return;

    await withAction('disconnect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/99food/store/disconnect', {
          method: 'POST',
          body: {
            provider_id: providerId,
          },
        });

        const operationError = getFirstOperationError(response);
        if (response?.error || operationError) {
          showError(response?.error || operationError || 'Nao foi possivel desconectar a loja.');
          return;
        }

        setManualShopId('');
        applyStoreSettingsResponse(response);
        await loadData({ silent: true });
        showSuccess('Loja desconectada da 99Food.');
      } catch (error) {
        showError(formatApiError(error));
      }
    });
  }, [
    applyStoreSettingsResponse,
    getFirstOperationError,
    loadData,
    providerId,
    showError,
    showSuccess,
    withAction,
  ]);

  const handlePreview = useCallback(async () => {
    if (!providerId) return;

    if (selectedEligibleProducts.length < MINIMUM_REQUIRED_ITEMS) {
      showError(`Selecione pelo menos ${MINIMUM_REQUIRED_ITEMS} produtos elegiveis para publicar.`);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await api.fetch('/marketplace/integrations/99food/menu/preview', {
        method: 'POST',
        body: {
          provider_id: providerId,
          product_ids: selectedEligibleProducts.map(product => product.id),
        },
      });

      if (Array.isArray(response?.errors) && response.errors.length > 0) {
        showError(response.errors[0]);
        return;
      }

      setPreviewData(response);
      setPreviewVisible(true);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setPreviewLoading(false);
    }
  }, [providerId, selectedEligibleProducts, showError]);

  const handleUpload = useCallback(async () => {
    if (!providerId) return;

    setUploading(true);
    try {
      const response = await api.fetch('/marketplace/integrations/99food/menu/upload', {
        method: 'POST',
        body: {
          provider_id: providerId,
          product_ids: selectedEligibleProducts.map(product => product.id),
        },
      });

      if (!isErrnoSuccess(response?.result?.errno)) {
        showError(response?.result?.errmsg || 'Nao foi possivel publicar o menu no 99Food.');
        return;
      }

      setLastUploadResult(response);
      if (response?.integration || response?.products) {
        applyDetailResponse({
          integration: response?.integration,
          products: response?.products,
        });
      } else {
        await loadData({ silent: true });
      }

      showInfo('Cardapio enviado para processamento na 99Food.');
      setPreviewVisible(false);

      const taskId =
        normalizeTaskId(response?.integration?.last_menu_task_id) ||
        normalizeTaskId(response?.result?.data?.taskID) ||
        normalizeTaskId(response?.result?.data?.taskId);

      if (taskId) {
        const taskResponse = await fetchMenuTaskStatus(taskId, { poll: true });

        if (taskResponse?.publish_state === 'published') {
          showSuccess('Cardapio publicado com sucesso na 99Food.');
        } else if (taskResponse?.publish_state === 'failed') {
          showError(taskResponse?.task_message || 'A publicacao do cardapio falhou na 99Food.');
        } else if (taskResponse?.publish_state === 'sync_error') {
          showError(taskResponse?.task_message || 'A task foi concluida, mas o catalogo remoto ainda nao foi confirmado.');
        } else {
          showInfo('A publicacao do cardapio segue em processamento na 99Food.');
        }
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setUploading(false);
    }
  }, [applyDetailResponse, fetchMenuTaskStatus, loadData, providerId, selectedEligibleProducts, showError, showInfo, showSuccess]);

  const selectionSummaryTone =
    selectedEligibleProducts.length >= MINIMUM_REQUIRED_ITEMS ? '#10B981' : '#F59E0B';

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa para continuar</Text>
          <Text style={styles.centerStateText}>
            A integracao 99Food sempre trabalha com a empresa ativa no filtro.
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
          <Text style={styles.centerStateTitle}>Carregando integracoes</Text>
          <Text style={styles.centerStateText}>
            Estamos buscando o status da loja e os produtos disponiveis.
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
            <Text style={styles.heroEyebrow}>Marketplace</Text>
            <Text style={styles.heroTitle}>Integracoes da loja</Text>
            <Text style={styles.heroText}>
              Gerencie a conexao da empresa atual com o 99Food, escolha produtos reais e publique menus validos.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="cpu" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={styles.companyRow}>
          <View>
            <Text style={styles.sectionTitle}>Empresa ativa</Text>
            <Text style={styles.companyName}>{currentCompany?.name || currentCompany?.alias || `Empresa #${providerId}`}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: connected ? '#DCFCE7' : '#FEF3C7' },
            ]}>
            <Text
              style={[
                styles.statusPillText,
                { color: connected ? '#166534' : '#92400E' },
              ]}>
              {connected ? '99Food conectado' : 'Integracao pendente'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map(card => (
            <View key={card.key} style={[styles.summaryCard, shadowStyle]}>
              <View style={[styles.summaryIcon, { backgroundColor: withOpacity(card.color, 0.12) }]}>
                <Icon name={card.icon} size={18} color={card.color} />
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.panel, shadowStyle]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Status da loja</Text>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() =>
                withAction('refresh', async () => {
                  if (lastMenuTaskId) {
                    await fetchMenuTaskStatus(lastMenuTaskId, { poll: false });
                    return;
                  }

                  await loadData({ silent: true });
                })
              }
              disabled={actionLoading === 'refresh'}>
              <Icon name="refresh-cw" size={14} color={brandColors.primary} />
              <Text style={[styles.inlineActionText, { color: brandColors.primary }]}>Atualizar</Text>
            </TouchableOpacity>
          </View>

          {!!lastMenuPublishState && (
            <View style={[styles.infoBanner, { backgroundColor: withOpacity(publicationTone, 0.12) }]}>
              <Icon
                name={lastMenuPublishState === 'failed' ? 'alert-triangle' : lastMenuPublishState === 'published' ? 'check-circle' : 'clock'}
                size={14}
                color={publicationTone}
              />
              <Text style={[styles.infoBannerText, { color: publicationTone }]}>
                {getPublishStateLabel(lastMenuPublishState)}
                {lastMenuTaskMessage ? ` • ${lastMenuTaskMessage}` : ''}
              </Text>
            </View>
          )}

          {!!lastErrorMessage && lastMenuPublishState !== 'failed' && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={14} color="#B91C1C" />
              <Text style={styles.errorBannerText}>{lastErrorMessage}</Text>
            </View>
          )}

          <View style={styles.statusRows}>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Business status</Text>
              <Text style={styles.statusRowValue}>
                {remoteConnected
                  ? integrationItem?.biz_status_label || statusLabelMap[storeBizStatus] || 'Indefinido'
                  : connected
                    ? 'Aguardando sync'
                    : 'Nao conectado'}
              </Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Substatus</Text>
              <Text style={styles.statusRowValue}>
                {remoteConnected
                  ? integrationItem?.sub_biz_status_label || subStatusLabelMap[storeSubStatus] || 'Indefinido'
                  : '-'}
              </Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Menus remotos</Text>
              <Text style={styles.statusRowValue}>{menuCount}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Itens remotos</Text>
              <Text style={styles.statusRowValue}>{menuItemCount}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Produtos publicados</Text>
              <Text style={styles.statusRowValue}>{publishedProductCount}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Itens remotos sem local</Text>
              <Text style={styles.statusRowValue}>{remoteOnlyItemCount}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Areas de entrega</Text>
              <Text style={styles.statusRowValue}>{deliveryAreaCount}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Ultimo task ID</Text>
              <Text style={styles.statusRowValue}>
                {lastMenuTaskId || '-'}
              </Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Status da task</Text>
              <Text style={styles.statusRowValue}>
                {lastMenuTaskStatus || '-'}
              </Text>
            </View>
            <View style={[styles.statusRowItem, styles.statusRowItemWide]}>
              <Text style={styles.statusRowLabel}>Ultima verificacao da task</Text>
              <Text style={styles.statusRowValueSmall}>
                {lastMenuTaskCheckedAt || 'Ainda nao verificada'}
              </Text>
            </View>
            <View style={[styles.statusRowItem, styles.statusRowItemWide]}>
              <Text style={styles.statusRowLabel}>Ultima sincronizacao</Text>
              <Text style={styles.statusRowValueSmall}>
                {lastSyncAt || 'Ainda nao sincronizado'}
              </Text>
            </View>
            <View style={[styles.statusRowItem, styles.statusRowItemWide]}>
              <Text style={styles.statusRowLabel}>Ultimo webhook recebido</Text>
              <Text style={styles.statusRowValueSmall}>
                {lastWebhookReceivedAt || 'Ainda nao recebido'}
              </Text>
            </View>
            <View style={[styles.statusRowItem, styles.statusRowItemWide]}>
              <Text style={styles.statusRowLabel}>Ultima reconciliacao</Text>
              <Text style={styles.statusRowValueSmall}>
                {lastReconcileAt || 'Ainda nao reconciliado'}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            {!connected ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: brandColors.primary }]}
                onPress={handleConnectStore}
                disabled={actionLoading === 'connect'}>
                {actionLoading === 'connect' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="link-2" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Integrar loja</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: isOnline ? '#F97316' : brandColors.primary },
                ]}
                onPress={() => handleStoreStatusChange(isOnline ? 2 : 1)}
                disabled={actionLoading === 'online' || actionLoading === 'offline'}>
                {actionLoading === 'online' || actionLoading === 'offline' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name={isOnline ? 'pause-circle' : 'play-circle'} size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>{isOnline ? 'Colocar offline' : 'Colocar online'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.panel, shadowStyle]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Configuracoes operacionais</Text>
              <Text style={styles.panelSubtitle}>
                Ajuste raio de atendimento, horario, metodo de entrega e conexao da loja.
              </Text>
            </View>
          </View>

          <View style={styles.statusRows}>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Raio atual</Text>
              <Text style={styles.statusRowValue}>{currentDeliveryRadius}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Metodo atual</Text>
              <Text style={styles.statusRowValue}>{currentDeliveryMethod}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Abertura atual</Text>
              <Text style={styles.statusRowValue}>{currentOpenTime}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Fechamento atual</Text>
              <Text style={styles.statusRowValue}>{currentCloseTime}</Text>
            </View>
            <View style={[styles.statusRowItem, styles.statusRowItemWide]}>
              <Text style={styles.statusRowLabel}>Metodo de confirmacao atual</Text>
              <Text style={styles.statusRowValue}>{currentConfirmMethod}</Text>
            </View>
          </View>

          <View style={styles.settingsForm}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Raio de atendimento (km)</Text>
              <TextInput
                value={storeSettingsDraft.deliveryRadiusKm}
                onChangeText={value =>
                  setStoreSettingsDraft(current => ({ ...current, deliveryRadiusKm: value }))
                }
                placeholder="Ex.: 5"
                keyboardType="decimal-pad"
                style={styles.formInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>Abertura (HH:mm)</Text>
                <TextInput
                  value={storeSettingsDraft.openTime}
                  onChangeText={value =>
                    setStoreSettingsDraft(current => ({ ...current, openTime: value }))
                  }
                  placeholder="08:00"
                  style={styles.formInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>Fechamento (HH:mm)</Text>
                <TextInput
                  value={storeSettingsDraft.closeTime}
                  onChangeText={value =>
                    setStoreSettingsDraft(current => ({ ...current, closeTime: value }))
                  }
                  placeholder="22:00"
                  style={styles.formInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>Metodo de entrega</Text>
                <TextInput
                  value={storeSettingsDraft.deliveryMethod}
                  onChangeText={value =>
                    setStoreSettingsDraft(current => ({ ...current, deliveryMethod: value }))
                  }
                  placeholder="1 (loja) ou 2 (99)"
                  style={styles.formInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>Metodo de confirmacao</Text>
                <TextInput
                  value={storeSettingsDraft.confirmMethod}
                  onChangeText={value =>
                    setStoreSettingsDraft(current => ({ ...current, confirmMethod: value }))
                  }
                  placeholder="Ex.: 1"
                  style={styles.formInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>ID da area de entrega (opcional)</Text>
              <TextInput
                value={storeSettingsDraft.deliveryAreaId}
                onChangeText={value =>
                  setStoreSettingsDraft(current => ({ ...current, deliveryAreaId: value }))
                }
                placeholder="Usa automaticamente a primeira area quando vazio"
                style={styles.formInput}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: brandColors.primary }]}
              onPress={handleSaveStoreSettings}
              disabled={actionLoading === 'save-settings'}>
              {actionLoading === 'save-settings' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="save" size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>Salvar configuracoes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {!connected && (
            <>
              <View style={styles.divider} />

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Conectar manualmente por shop_id</Text>
                <TextInput
                  value={manualShopId}
                  onChangeText={setManualShopId}
                  placeholder="Informe o shop_id da 99Food"
                  style={styles.formInput}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.formRow}>
                <TouchableOpacity
                  style={[styles.secondaryActionButton, { borderColor: brandColors.primary }]}
                  onPress={handleManualBindStore}
                  disabled={actionLoading === 'bind-manual'}>
                  {actionLoading === 'bind-manual' ? (
                    <ActivityIndicator size="small" color={brandColors.primary} />
                  ) : (
                    <>
                      <Icon name="link" size={15} color={brandColors.primary} />
                      <Text style={[styles.secondaryActionButtonText, { color: brandColors.primary }]}>Vincular shop_id</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {connected && (
            <View style={[styles.formRow, styles.formRowSingle]}>
              <TouchableOpacity
                style={[styles.secondaryActionButton, styles.dangerActionButton]}
                onPress={handleDisconnectStore}
                disabled={actionLoading === 'disconnect'}>
                {actionLoading === 'disconnect' ? (
                  <ActivityIndicator size="small" color="#B91C1C" />
                ) : (
                  <>
                    <Icon name="unlink" size={15} color="#B91C1C" />
                    <Text style={[styles.secondaryActionButtonText, { color: '#B91C1C' }]}>Desconectar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.panel, shadowStyle]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Selecao de produtos</Text>
              <Text style={styles.panelSubtitle}>
                Escolha pelo menos {MINIMUM_REQUIRED_ITEMS} produtos elegiveis para o menu do 99Food.
              </Text>
            </View>
            <View
              style={[
                styles.selectionBadge,
                { backgroundColor: withOpacity(selectionSummaryTone, 0.12) },
              ]}>
              <Text style={[styles.selectionBadgeText, { color: selectionSummaryTone }]}>
                {selectedEligibleProducts.length}/{MINIMUM_REQUIRED_ITEMS}
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar produto, categoria ou codigo"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
            {filterTabs.map(tab => {
              const active = filterKey === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: withOpacity(brandColors.primary, 0.12), borderColor: withOpacity(brandColors.primary, 0.25) },
                  ]}
                  onPress={() => setFilterKey(tab.key)}>
                  <Text
                    style={[
                      styles.filterChipText,
                      active && { color: brandColors.primary },
                    ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.selectionSummaryRow}>
            <Text style={styles.selectionSummaryText}>
              {productsResponse?.eligible_product_count || 0} produtos aptos no cadastro atual
            </Text>
            <TouchableOpacity
              style={[
                styles.previewButton,
                {
                  backgroundColor:
                    selectedEligibleProducts.length >= MINIMUM_REQUIRED_ITEMS
                      ? brandColors.primary
                      : '#CBD5E1',
                },
              ]}
              onPress={handlePreview}
              disabled={previewLoading || selectedEligibleProducts.length < MINIMUM_REQUIRED_ITEMS}>
              {previewLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="eye" size={15} color="#fff" />
                  <Text style={styles.previewButtonText}>Pre-visualizar menu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.productsList}>
            {filteredProducts.map(product => {
              const selected = selectedProductSet.has(String(product.id));
              const eligible = Boolean(product.eligible);
              const publishedRemotely = Boolean(product.published_remotely);

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard,
                    selected && { borderColor: brandColors.primary, backgroundColor: withOpacity(brandColors.primary, 0.04) },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => handleToggleProduct(product)}>
                  <View style={styles.productMain}>
                    <View
                      style={[
                        styles.productStatusIcon,
                        { backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2' },
                      ]}>
                      <Icon
                        name={selected ? 'check-circle' : eligible ? 'circle' : 'x-circle'}
                        size={16}
                        color={
                          selected
                            ? brandColors.primary
                            : eligible
                              ? '#16A34A'
                              : '#DC2626'
                        }
                      />
                    </View>
                    <View style={styles.productContent}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productPrice}>R$ {Number(product.price || 0).toFixed(2)}</Text>
                      </View>
                      <Text style={styles.productMeta} numberOfLines={1}>
                        {product.category?.name || 'Sem categoria'} • {product.type || 'produto'}
                      </Text>
                      {!!product.description && (
                        <Text style={styles.productDescription} numberOfLines={1}>
                          {product.description}
                        </Text>
                      )}
                      {!!product.food99_code && (
                        <Text style={styles.productCode}>Codigo 99: {product.food99_code}</Text>
                      )}
                      {publishedRemotely && (
                        <Text style={styles.productRemoteState}>Ja publicado no catalogo remoto</Text>
                      )}
                      {!eligible && Array.isArray(product.blockers) && product.blockers.length > 0 && (
                        <Text style={styles.productBlocker}>{product.blockers.join(' • ')}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AnimatedModal visible={previewVisible} onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalShell}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pre-visualizacao do menu</Text>
                <Text style={styles.modalSubtitle}>
                  {previewData?.eligible_product_count || selectedEligibleProducts.length} produtos prontos para upload
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.modalCloseButton}>
                <Icon name="x" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <View style={styles.modalSummaryGrid}>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>
                    {countCollection(previewData?.payload?.menus)}
                  </Text>
                  <Text style={styles.modalSummaryLabel}>Menus</Text>
                </View>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>
                    {countCollection(previewData?.payload?.categories)}
                  </Text>
                  <Text style={styles.modalSummaryLabel}>Categorias</Text>
                </View>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>
                    {countCollection(previewData?.payload?.items)}
                  </Text>
                  <Text style={styles.modalSummaryLabel}>Itens</Text>
                </View>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Categorias</Text>
                {(previewData?.payload?.categories || []).map(category => (
                  <View key={category.app_category_id} style={styles.previewLine}>
                    <Text style={styles.previewLineTitle}>{category.category_name}</Text>
                    <Text style={styles.previewLineMeta}>
                      {countCollection(category.app_item_ids)} item(ns)
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Itens selecionados</Text>
                {selectedEligibleProducts.map(product => (
                  <View key={product.id} style={styles.previewLine}>
                    <Text style={styles.previewLineTitle}>{product.name}</Text>
                    <Text style={styles.previewLineMeta}>
                      {product.category?.name || 'Sem categoria'} • R$ {Number(product.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setPreviewVisible(false)}>
                <Text style={styles.secondaryButtonText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: brandColors.primary }]}
                onPress={handleUpload}
                disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="upload-cloud" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Publicar menu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AnimatedModal>
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
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  panelSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginTop: 4,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    backgroundColor: '#FEE2E2',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    color: '#B91C1C',
  },
  statusRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusRowItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
  },
  statusRowItemWide: {
    width: '100%',
  },
  statusRowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  statusRowValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },
  statusRowValueSmall: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 18,
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  settingsForm: {
    marginTop: 14,
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  formRowSingle: {
    justifyContent: 'flex-end',
  },
  formField: {
    width: '100%',
    gap: 6,
  },
  formFieldHalf: {
    width: '48%',
  },
  formLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    minHeight: 42,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dangerActionButton: {
    borderColor: '#FECACA',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 4,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
  },
  filterTabsRow: {
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  selectionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  selectionSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  selectionBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewButton: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  productsList: {
    gap: 10,
  },
  productCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff',
  },
  productMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  productStatusIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  productContent: {
    flex: 1,
    minWidth: 0,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  productMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  productRemoteState: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
    marginTop: 4,
  },
  productBlocker: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
  },
  modalShell: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalContent: {
    paddingBottom: 10,
  },
  modalSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  modalSummaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalSummaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  previewSection: {
    marginBottom: 18,
  },
  previewSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  previewLine: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  previewLineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  previewLineMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  modalPrimaryButton: {
    flex: 1.4,
  },
});


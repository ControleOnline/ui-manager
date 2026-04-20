import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { getOrderChannelLogo } from '@assets/ppc/channels';

import IntegrationHero from '../../components/integrations/IntegrationHero';
import IntegrationTabs from '../../components/integrations/IntegrationTabs';
import { integrationCardShadowStyle } from '../../utils/integrationPage';
import Food99CatalogTab from './components/Food99CatalogTab';
import Food99OverviewTab from './components/Food99OverviewTab';
import Food99PreviewModal from './components/Food99PreviewModal';
import Food99SettingsTab from './components/Food99SettingsTab';
import Food99StoreTab from './components/Food99StoreTab';
import styles from './styles';
import {
  createEmptyStoreSettingsDraft,
  filterTabs,
  formatDeliveryMethodLabel,
  formatFood99ApiError,
  getPublishStateLabel,
  isErrnoSuccess,
  isValidTimeInput,
  MINIMUM_REQUIRED_ITEMS,
  normalizeDeliveryMethodCode,
  normalizeTaskId,
  publishStateToneMap,
  sanitizeConfirmMethodInput,
  sanitizeRadiusInput,
  sanitizeTimeInput,
  statusLabelMap,
  subStatusLabelMap,
  wait,
} from './utils';

// Página principal da integração 99Food com separação por contexto.
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

  const providerId = currentCompany?.id;
  const logo = getOrderChannelLogo({ app: '99Food' });

  const [activeTab, setActiveTab] = useState('overview');
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
    () => selectedProductIds.map(id => productMap.get(String(id))).filter(Boolean),
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
  const settingsSource = String(storeSettingsResponse?.settings_source || 'unavailable');
  const settingsSourceLabelMap = {
    remote: 'Remoto',
    mixed: 'Remoto + fallback local',
    fallback: 'Fallback local',
    unavailable: 'Indisponivel',
  };
  const settingsSourceLabel = settingsSourceLabelMap[settingsSource] || settingsSource;

  const resolveSettingDisplay = value =>
    value === null || value === undefined || String(value).trim() === '' ? '-' : String(value);

  const currentDeliveryRadius = resolveSettingDisplay(storeSettings?.delivery_radius);
  const currentOpenTime = resolveSettingDisplay(storeSettings?.open_time);
  const currentCloseTime = resolveSettingDisplay(storeSettings?.close_time);
  const currentDeliveryMethod = formatDeliveryMethodLabel(storeSettings?.delivery_method);
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

  const storeStatusRows = [
    {
      label: 'Business status',
      value: remoteConnected
        ? integrationItem?.biz_status_label || statusLabelMap[storeBizStatus] || 'Indefinido'
        : connected
          ? 'Aguardando sync'
          : 'Nao conectado',
    },
    {
      label: 'Substatus',
      value: remoteConnected
        ? integrationItem?.sub_biz_status_label || subStatusLabelMap[storeSubStatus] || 'Indefinido'
        : '-',
    },
    { label: 'Menus remotos', value: String(menuCount) },
    { label: 'Itens remotos', value: String(menuItemCount) },
    { label: 'Produtos publicados', value: String(publishedProductCount) },
    { label: 'Itens remotos sem local', value: String(remoteOnlyItemCount) },
    { label: 'Areas de entrega', value: String(deliveryAreaCount) },
    { label: 'Ultimo task ID', value: lastMenuTaskId || '-' },
    { label: 'Status da task', value: lastMenuTaskStatus || '-' },
    { label: 'Ultima verificacao da task', value: lastMenuTaskCheckedAt || 'Ainda nao verificada', wide: true, small: true },
    { label: 'Ultima sincronizacao', value: lastSyncAt || 'Ainda nao sincronizado', wide: true, small: true },
    { label: 'Ultimo webhook recebido', value: lastWebhookReceivedAt || 'Ainda nao recebido', wide: true, small: true },
    { label: 'Ultima reconciliacao', value: lastReconcileAt || 'Ainda nao reconciliado', wide: true, small: true },
  ];

  const settingsSummaryRows = [
    { label: 'Raio atual', value: currentDeliveryRadius },
    { label: 'Metodo atual', value: currentDeliveryMethod },
    { label: 'Abertura atual', value: currentOpenTime },
    { label: 'Fechamento atual', value: currentCloseTime },
    { label: 'Metodo de confirmacao atual', value: currentConfirmMethod, wide: true },
    { label: 'Fonte dos valores atuais', value: settingsSourceLabel, wide: true, small: true },
  ];

  const tabCounts = {
    all: products.length,
    eligible: products.filter(product => product.eligible).length,
    selected: selectedEligibleProducts.length,
    blocked: products.filter(product => !product.eligible).length,
  };

  const hydrateSelection = useCallback(productList => {
    if (hasHydratedSelection.current) return;

    const preselected = productList
      .filter(product => product?.eligible && Boolean(product.published_remotely))
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

  const applyDetailResponse = useCallback((detailResponse, { syncPublishedSelection = false } = {}) => {
    setIntegrationItem(detailResponse?.integration || null);
    setProductsResponse(detailResponse?.products || null);

    if (syncPublishedSelection) {
      syncSelectionWithPublishedProducts(detailResponse?.products?.products || []);
    } else {
      hydrateSelection(detailResponse?.products?.products || []);
    }
  }, [hydrateSelection, syncSelectionWithPublishedProducts]);

  const applyStoreSettingsResponse = useCallback(response => {
    const settings = response?.settings || {};

    setStoreSettingsResponse(response || null);
    setStoreSettingsDraft({
      deliveryRadiusKm:
        settings?.delivery_radius === null || settings?.delivery_radius === undefined
          ? ''
          : String(settings.delivery_radius),
      openTime: settings?.open_time ? sanitizeTimeInput(String(settings.open_time)) : '',
      closeTime: settings?.close_time ? sanitizeTimeInput(String(settings.close_time)) : '',
      deliveryMethod: normalizeDeliveryMethodCode(settings?.delivery_method),
      confirmMethod: settings?.confirm_method ? sanitizeConfirmMethodInput(String(settings.confirm_method)) : '',
      deliveryAreaId: settings?.delivery_area_id ? String(settings.delivery_area_id) : '',
    });
  }, []);

  const loadData = useCallback(async ({ silent = false, refreshRemote = false } = {}) => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const detailParams = { provider_id: providerId };
      if (refreshRemote) detailParams.refresh_remote = 1;

      const [detailResponse, settingsResponse] = await Promise.all([
        api.fetch('/marketplace/integrations/99food/detail', { params: detailParams }),
        api.fetch('/marketplace/integrations/99food/store/settings', {
          params: { provider_id: providerId },
        }),
      ]);

      applyDetailResponse(detailResponse);
      applyStoreSettingsResponse(settingsResponse);
    } catch (error) {
      showError(formatFood99ApiError(error));
    } finally {
      setLoading(false);
    }
  }, [applyDetailResponse, applyStoreSettingsResponse, providerId, showError]);

  const fetchMenuTaskStatus = useCallback(async (taskId, { poll = false } = {}) => {
    if (!providerId || !taskId) return null;

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
          { syncPublishedSelection: response?.publish_state === 'published' },
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
  }, [applyDetailResponse, loadData, providerId]);

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
        await loadData({ silent: true, refreshRemote: true });
      }
    } catch (error) {
      showError(formatFood99ApiError(error));
    } finally {
      setRefreshing(false);
    }
  }, [fetchMenuTaskStatus, lastMenuTaskId, loadData, showError]);

  const withAction = useCallback(async (key, action) => {
    setActionLoading(key);
    try {
      await action();
    } finally {
      setActionLoading('');
    }
  }, []);

  const handleToggleProduct = useCallback(product => {
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
  }, [showError]);

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
        showError(formatFood99ApiError(error));
      }
    });
  }, [providerId, showError, showInfo, showSuccess, withAction]);

  const handleStoreStatusChange = useCallback(async nextStatus => {
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
        showError(formatFood99ApiError(error));
      }
    });
  }, [loadData, providerId, showError, showSuccess, withAction]);

  const getFirstOperationError = useCallback(response => {
    if (!response || typeof response !== 'object') return null;

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
        const deliveryRadius = String(storeSettingsDraft?.deliveryRadiusKm || '').trim();
        const openTime = String(storeSettingsDraft?.openTime || '').trim();
        const closeTime = String(storeSettingsDraft?.closeTime || '').trim();
        const deliveryMethod = String(storeSettingsDraft?.deliveryMethod || '').trim();
        const confirmMethod = String(storeSettingsDraft?.confirmMethod || '').trim();
        const deliveryAreaId = String(storeSettingsDraft?.deliveryAreaId || '').trim();

        if (deliveryRadius && !/^\d+(\.\d{1,2})?$/.test(deliveryRadius)) {
          showError('Raio de atendimento invalido. Use numero positivo (ex.: 5 ou 5.5).');
          return;
        }

        if ((openTime || closeTime) && (!isValidTimeInput(openTime) || !isValidTimeInput(closeTime))) {
          showError('Horario invalido. Use o formato HH:mm (ex.: 08:00).');
          return;
        }

        if (deliveryMethod && !['1', '2'].includes(deliveryMethod)) {
          showError('Metodo de entrega invalido. Selecione Loja (2) ou Entrega 99 (1).');
          return;
        }

        if (confirmMethod && !/^\d{1,3}$/.test(confirmMethod)) {
          showError('Metodo de confirmacao invalido. Informe apenas numeros.');
          return;
        }

        const payload = { provider_id: providerId };
        if (deliveryRadius) payload.delivery_radius_km = deliveryRadius;
        if (openTime) payload.open_time = openTime;
        if (closeTime) payload.close_time = closeTime;
        if (deliveryMethod) payload.delivery_method = deliveryMethod;
        if (confirmMethod) payload.confirm_method = confirmMethod;
        if (deliveryAreaId) payload.delivery_area_id = deliveryAreaId;

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
        showError(formatFood99ApiError(error));
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
        showError(formatFood99ApiError(error));
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
          body: { provider_id: providerId },
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
        showError(formatFood99ApiError(error));
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
      showError(formatFood99ApiError(error));
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
      showError(formatFood99ApiError(error));
    } finally {
      setUploading(false);
    }
  }, [applyDetailResponse, fetchMenuTaskStatus, loadData, providerId, selectedEligibleProducts, showError, showInfo, showSuccess]);

  const handleRefreshStoreStatus = useCallback(async () => {
    await withAction('refresh', async () => {
      if (lastMenuTaskId) {
        await fetchMenuTaskStatus(lastMenuTaskId, { poll: false });
        return;
      }
      await loadData({ silent: true });
    });
  }, [fetchMenuTaskStatus, lastMenuTaskId, loadData, withAction]);

  const selectionSummaryTone =
    selectedEligibleProducts.length >= MINIMUM_REQUIRED_ITEMS ? '#10B981' : '#F59E0B';

  const sectionTabs = [
    { key: 'overview', label: 'Resumo' },
    { key: 'store', label: 'Loja' },
    { key: 'settings', label: 'Operacao' },
    { key: 'catalog', label: 'Cardapio', badge: selectedEligibleProducts.length },
  ];

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
        <IntegrationHero
          shadowStyle={integrationCardShadowStyle}
          accentColor={brandColors.primary}
          eyebrow="Marketplace"
          title="Integracao 99Food"
          description="Separei leitura geral, vínculo da loja, configuração operacional e catálogo para reduzir a complexidade da tela."
          logo={logo}
          iconName="cpu"
        />

        <IntegrationTabs
          tabs={sectionTabs}
          activeKey={activeTab}
          onChange={setActiveTab}
          accentColor={brandColors.primary}
        />

        {activeTab === 'overview' && (
          <Food99OverviewTab
            shadowStyle={integrationCardShadowStyle}
            currentCompany={currentCompany}
            providerId={providerId}
            connected={connected}
            summaryCards={summaryCards}
            lastMenuPublishState={lastMenuPublishState}
            publicationTone={publicationTone}
            publishStateLabel={getPublishStateLabel(lastMenuPublishState)}
            lastMenuTaskMessage={lastMenuTaskMessage}
            lastErrorMessage={lastErrorMessage}
          />
        )}

        {activeTab === 'store' && (
          <Food99StoreTab
            shadowStyle={integrationCardShadowStyle}
            accentColor={brandColors.primary}
            statusRows={storeStatusRows}
            lastMenuPublishState={lastMenuPublishState}
            publicationTone={publicationTone}
            publishStateLabel={getPublishStateLabel(lastMenuPublishState)}
            lastMenuTaskMessage={lastMenuTaskMessage}
            lastErrorMessage={lastErrorMessage}
            actionLoading={actionLoading}
            connected={connected}
            isOnline={isOnline}
            onRefresh={handleRefreshStoreStatus}
            onConnect={handleConnectStore}
            onToggleStatus={() => handleStoreStatusChange(isOnline ? 2 : 1)}
            manualShopId={manualShopId}
            setManualShopId={setManualShopId}
            onManualBind={handleManualBindStore}
            onDisconnect={handleDisconnectStore}
          />
        )}

        {activeTab === 'settings' && (
          <Food99SettingsTab
            shadowStyle={integrationCardShadowStyle}
            accentColor={brandColors.primary}
            settingsSummaryRows={settingsSummaryRows}
            storeSettingsDraft={storeSettingsDraft}
            setStoreSettingsDraft={setStoreSettingsDraft}
            actionLoading={actionLoading}
            onSave={handleSaveStoreSettings}
          />
        )}

        {activeTab === 'catalog' && (
          <Food99CatalogTab
            shadowStyle={integrationCardShadowStyle}
            accentColor={brandColors.primary}
            selectionSummaryTone={selectionSummaryTone}
            search={search}
            setSearch={setSearch}
            filterKey={filterKey}
            setFilterKey={setFilterKey}
            tabCounts={tabCounts}
            productsResponse={productsResponse}
            selectedEligibleProducts={selectedEligibleProducts}
            previewLoading={previewLoading}
            onPreview={handlePreview}
            filteredProducts={filteredProducts}
            selectedProductSet={selectedProductSet}
            onToggleProduct={handleToggleProduct}
          />
        )}
      </ScrollView>

      <Food99PreviewModal
        visible={previewVisible}
        previewData={previewData}
        selectedEligibleProducts={selectedEligibleProducts}
        uploading={uploading}
        accentColor={brandColors.primary}
        onClose={() => setPreviewVisible(false)}
        onUpload={handleUpload}
      />
    </SafeAreaView>
  );
}

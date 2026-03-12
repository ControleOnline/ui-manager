
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
  const [storeResponse, setStoreResponse] = useState(null);
  const [productsResponse, setProductsResponse] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [lastUploadResult, setLastUploadResult] = useState(null);
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

  const menuDetails = storeResponse?.menu?.data || {};
  const remoteStore = storeResponse?.store?.data || null;
  const deliveryAreas = Array.isArray(storeResponse?.delivery_areas?.data?.area_group)
    ? storeResponse.delivery_areas.data.area_group
    : [];
  const remoteMenuItems = Array.isArray(menuDetails?.items) ? menuDetails.items : [];
  const remoteMenus = Array.isArray(menuDetails?.menus) ? menuDetails.menus : [];
  const connected = Boolean(integrationItem?.connected);
  const remoteConnected = Boolean(
    integrationItem?.remote_connected || (storeResponse?.store?.errno ?? 1) === 0,
  );
  const storeBizStatus = Number(remoteStore?.biz_status ?? remoteStore?.store_status ?? 0);
  const storeSubStatus = Number(remoteStore?.sub_biz_status ?? 0);
  const isOnline = remoteConnected && storeBizStatus === 1;

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
        label: 'Produtos aptos',
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
        return Boolean(product.published_remotely || product.food99_code);
      })
      .map(product => String(product.id));

    if (preselected.length > 0) {
      setSelectedProductIds(preselected);
    }

    hasHydratedSelection.current = true;
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
        const detailResponse = await api.fetch('/marketplace/integrations/99food/detail', {
          params: { provider_id: providerId },
        });

        setIntegrationItem(detailResponse?.integration || null);
        setProductsResponse(detailResponse?.products || null);
        setStoreResponse(detailResponse || null);
        hydrateSelection(detailResponse?.products?.products || []);
      } catch (error) {
        showError(formatApiError(error));
      } finally {
        setLoading(false);
      }
    },
    [hydrateSelection, providerId, showError],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

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

        if ((response?.errno ?? 1) === 0) {
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

          if ((response?.errno ?? 1) !== 0) {
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

      if ((response?.result?.errno ?? 1) !== 0) {
        showError(response?.result?.errmsg || 'Nao foi possivel publicar o menu no 99Food.');
        return;
      }

      setLastUploadResult(response);
      showSuccess('Menu publicado no 99Food com sucesso.');
      setPreviewVisible(false);
      await loadData({ silent: true });
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setUploading(false);
    }
  }, [loadData, providerId, selectedEligibleProducts, showError, showSuccess]);

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
              onPress={() => loadData({ silent: true })}
              disabled={actionLoading === 'refresh'}>
              <Icon name="refresh-cw" size={14} color={brandColors.primary} />
              <Text style={[styles.inlineActionText, { color: brandColors.primary }]}>Atualizar</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={styles.statusRowValue}>{countCollection(remoteMenus)}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Itens remotos</Text>
              <Text style={styles.statusRowValue}>{countCollection(remoteMenuItems)}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Areas de entrega</Text>
              <Text style={styles.statusRowValue}>{deliveryAreas.length}</Text>
            </View>
            <View style={styles.statusRowItem}>
              <Text style={styles.statusRowLabel}>Ultimo task ID</Text>
              <Text style={styles.statusRowValue}>
                {lastUploadResult?.result?.data?.taskID || lastUploadResult?.result?.data?.taskId || '-'}
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
  actionRow: {
    marginTop: 18,
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


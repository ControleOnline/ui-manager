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

const filterTabs = [
  { key: 'all',      label: 'Todos' },
  { key: 'eligible', label: 'Elegiveis' },
  { key: 'selected', label: 'Selecionados' },
  { key: 'blocked',  label: 'Com bloqueio' },
];

const shadowStyle = Platform.select({
  ios:     { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
  android: { elevation: 3 },
  web:     { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar os dados da integracao iFood.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar os dados da integracao iFood.';
};

export default function IFoodIntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore  = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showInfo } = useToastMessage();

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const providerId = currentCompany?.id;

  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]        = useState(false);
  const [actionLoading,    setActionLoading]     = useState(null);
  const [detail,           setDetail]            = useState(null);
  const [productsResponse, setProductsResponse]  = useState(null);
  const [merchantIdInput,  setMerchantIdInput]   = useState('');
  const [selectedIds,      setSelectedIds]       = useState(new Set());
  const [filterKey,        setFilterKey]         = useState('all');
  const [search,           setSearch]            = useState('');

  /* ------------------------------------------------------------------ */
  /* produtos                                                             */
  /* ------------------------------------------------------------------ */
  const products = useMemo(
    () => (Array.isArray(productsResponse?.products) ? productsResponse.products : []),
    [productsResponse],
  );

  const syncPublishedSelection = useCallback(productList => {
    const ids = (Array.isArray(productList) ? productList : [])
      .filter(p => p?.eligible && p?.published_remotely)
      .map(p => String(p.id));
    setSelectedIds(new Set(ids));
  }, []);

  const applyDetailResponse = useCallback((response, { syncSelection = false } = {}) => {
    setDetail(response || null);
    const integrationMerchantId = String(
      response?.integration?.merchant_id || response?.integration?.ifood_code || response?.selected_store?.merchant_id || '',
    );
    if (integrationMerchantId !== '') setMerchantIdInput(integrationMerchantId);

    if (response?.products) {
      setProductsResponse(response.products);
      if (syncSelection) {
        syncPublishedSelection(response.products?.products || []);
      }
    }
  }, [syncPublishedSelection]);

  /* ------------------------------------------------------------------ */
  /* carregamento                                                         */
  /* ------------------------------------------------------------------ */
  const loadDetail = useCallback(async ({ refreshRemote = false } = {}) => {
    if (!providerId) { setLoading(false); return; }
    try {
      const params = { provider_id: providerId };
      if (refreshRemote) params.refresh_remote = 1;
      const response = await api.fetch('/marketplace/integrations/ifood/detail', { params });
      applyDetailResponse(response);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [applyDetailResponse, providerId, showError]);

  const loadProducts = useCallback(async () => {
    if (!providerId) return;
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/products', {
        params: { provider_id: providerId },
      });
      if (response?.products) {
        setProductsResponse(response.products);
        syncPublishedSelection(response.products?.products || []);
      }
    } catch (error) {
      showError(formatApiError(error));
    }
  }, [providerId, showError, syncPublishedSelection]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
      loadProducts();
    }, [loadDetail, loadProducts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDetail({ refreshRemote: true }), loadProducts()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail, loadProducts]);

  const withAction = useCallback(async (actionName, callback) => {
    setActionLoading(actionName);
    try { await callback(); }
    finally { setActionLoading(null); }
  }, []);

  /* ------------------------------------------------------------------ */
  /* filtro de produtos                                                   */
  /* ------------------------------------------------------------------ */
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (filterKey === 'eligible' && !p.eligible) return false;
      if (filterKey === 'blocked'  &&  p.eligible) return false;
      if (filterKey === 'selected' && !selectedIds.has(String(p.id))) return false;
      if (q && !String(p.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, filterKey, search, selectedIds]);

  const toggleProduct = useCallback(id => {
    const key = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const selectedEligible = useMemo(
    () => products.filter(p => p.eligible && selectedIds.has(String(p.id))),
    [products, selectedIds],
  );

  /* ------------------------------------------------------------------ */
  /* acoes                                                                */
  /* ------------------------------------------------------------------ */
  const handleSync = useCallback(async () => {
    if (!providerId) return;
    await withAction('sync', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/sync', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId }),
        });
        applyDetailResponse(response);
        showInfo('Estado da integracao iFood sincronizado.');
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleCatalogSync = useCallback(async () => {
    if (!providerId) return;
    await withAction('catalog_sync', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/menu/sync', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId }),
        });
        applyDetailResponse(response, { syncSelection: true });
        const synced = response?.result?.data?.synced ?? 0;
        showInfo(`Catalogo iFood sincronizado. ${synced} produto(s) vinculado(s).`);
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleMenuUpload = useCallback(async () => {
    if (!providerId) return;
    if (selectedEligible.length === 0) {
      showInfo('Selecione ao menos um produto elegivel para publicar.');
      return;
    }
    await withAction('menu_upload', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/menu/upload', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: providerId,
            product_ids: selectedEligible.map(p => p.id),
          }),
        });
        applyDetailResponse(response, { syncSelection: true });
        if (String(response?.result?.errno ?? '') === '0') {
          const pushed = response?.result?.data?.pushed_count ?? 0;
          showInfo(`Cardapio enviado ao iFood. ${pushed} produto(s) publicado(s).`);
          return;
        }
        showError(formatApiError(response?.result || response));
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, selectedEligible, showError, showInfo, withAction]);

  const handleConnect = useCallback(async () => {
    if (!providerId) return;
    const merchantId = String(merchantIdInput || '').trim();
    if (!merchantId) { showInfo('Informe o merchant_id da loja iFood para conectar.'); return; }
    await withAction('connect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/connect', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId, merchant_id: merchantId }),
        });
        applyDetailResponse(response);
        showInfo('Loja iFood conectada com sucesso.');
        loadProducts();
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, loadProducts, merchantIdInput, providerId, showError, showInfo, withAction]);

  const handleDisconnect = useCallback(async () => {
    if (!providerId) return;
    await withAction('disconnect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/disconnect', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId }),
        });
        applyDetailResponse(response);
        setMerchantIdInput('');
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, showError, withAction]);

  /* ------------------------------------------------------------------ */
  /* render estados vazios                                                */
  /* ------------------------------------------------------------------ */
  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa ativa</Text>
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
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------ */
  /* dados derivados                                                      */
  /* ------------------------------------------------------------------ */
  const integration    = detail?.integration || {};
  const stores         = Array.isArray(detail?.stores?.items) ? detail.stores.items : [];
  const selectedStore  = detail?.selected_store || stores.find(
    s => String(s?.merchant_id || '') === String(integration?.merchant_id || ''),
  );
  const connected      = Boolean(integration?.connected);
  const authAvailable  = Boolean(integration?.auth_available);
  const remoteConnected = Boolean(integration?.remote_connected);
  const statusTone     = connected ? '#16A34A' : '#F59E0B';
  const statusText     = connected ? 'Conectada' : 'Pendente';
  const logo           = getOrderChannelLogo({ app: 'iFood' });
  const eligibleCount  = productsResponse?.eligible_product_count || 0;

  const tabCounts = {
    all:      products.length,
    eligible: products.filter(p => p.eligible).length,
    selected: selectedIds.size,
    blocked:  products.filter(p => !p.eligible).length,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        )}>

        {/* hero */}
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>MARKETPLACE</Text>
            <Text style={styles.heroTitle}>Integracao iFood</Text>
            <Text style={styles.heroText}>Gerencie vinculacao da loja, cardapio e monitoramento remoto.</Text>
          </View>
          <View style={styles.heroBadge}>
            {logo
              ? <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
              : <Icon name="shopping-bag" size={20} color={brandColors.primary} />}
          </View>
        </View>

        {/* status */}
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
              <Text style={styles.metaValue}>{integration?.merchant_name || integration?.merchant_id || 'Nao vinculada'}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Status remoto</Text>
              <Text style={styles.metaValue}>{integration?.merchant_status_label || 'Indefinido'}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Token OAuth</Text>
              <Text style={styles.metaValue}>{authAvailable ? 'Disponivel' : 'Indisponivel'}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Produtos aptos</Text>
              <Text style={styles.metaValue}>{eligibleCount}</Text>
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

        {/* lojas */}
        <View style={[styles.sectionCard, shadowStyle]}>
          <Text style={styles.sectionTitle}>Lojas disponiveis no iFood</Text>

          {stores.length > 0 ? (
            <View style={styles.storesList}>
              {stores.map(store => {
                const sid      = String(store?.merchant_id || '');
                const selected = sid !== '' && sid === merchantIdInput;
                return (
                  <TouchableOpacity
                    key={sid}
                    activeOpacity={0.9}
                    style={[styles.storeCard, selected && styles.storeCardSelected]}
                    onPress={() => setMerchantIdInput(sid)}>
                    <View style={styles.storeTop}>
                      <Text style={styles.storeName}>{store?.name || `Loja ${sid}`}</Text>
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
                    <Text style={styles.storeCode}>merchant_id: {sid}</Text>
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
              {actionLoading === 'connect'
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <><Icon name="link" size={16} color="#FFFFFF" /><Text style={styles.actionButtonText}>Conectar</Text></>}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.actionButtonSecondary, !connected && styles.actionButtonSecondaryDisabled]}
              onPress={handleDisconnect}
              disabled={actionLoading !== null || !connected}>
              {actionLoading === 'disconnect'
                ? <ActivityIndicator color="#EF4444" size="small" />
                : <><Icon name="x-circle" size={16} color="#EF4444" /><Text style={styles.actionButtonSecondaryText}>Desconectar</Text></>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.syncButton, { borderColor: brandColors.primary }]}
            onPress={handleSync}
            disabled={actionLoading !== null}>
            {actionLoading === 'sync'
              ? <ActivityIndicator color={brandColors.primary} size="small" />
              : <><Icon name="refresh-cw" size={16} color={brandColors.primary} /><Text style={[styles.syncButtonText, { color: brandColors.primary }]}>Sincronizar estado remoto</Text></>}
          </TouchableOpacity>

          {!!selectedStore && (
            <View style={styles.selectedStoreBox}>
              <Text style={styles.selectedStoreTitle}>Loja selecionada</Text>
              <Text style={styles.selectedStoreText}>{selectedStore?.name || 'Sem nome'}</Text>
              <Text style={styles.selectedStoreText}>merchant_id: {selectedStore?.merchant_id}</Text>
            </View>
          )}
        </View>

        {/* cardapio / catalogo */}
        <View style={[styles.sectionCard, shadowStyle]}>
          <View style={styles.menuHeader}>
            <Text style={styles.sectionTitle}>Cardapio iFood</Text>
            <View style={[
              styles.menuStatusChip,
              { backgroundColor: withOpacity(connected ? '#16A34A' : '#F59E0B', 0.14) },
            ]}>
              <Text style={[styles.menuStatusText, { color: connected ? '#166534' : '#92400E' }]}>
                {connected ? 'Pronto para publicar' : 'Conecte a loja'}
              </Text>
            </View>
          </View>

          <Text style={styles.menuHelperText}>
            Selecione os produtos do seu sistema que deseja publicar no iFood. Produtos ja publicados estao pre-selecionados.
          </Text>

          {/* busca */}
          <View style={styles.searchRow}>
            <Icon name="search" size={14} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar produto..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
            {filterTabs.map(tab => {
              const active = filterKey === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  style={[styles.filterTab, active && { backgroundColor: brandColors.primary, borderColor: brandColors.primary }]}
                  onPress={() => setFilterKey(tab.key)}>
                  <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                    {tab.label} ({tabCounts[tab.key]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* resumo */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {eligibleCount} produto(s) apto(s) · {selectedIds.size} selecionado(s) · {selectedEligible.length} pronto(s) para upload
            </Text>
          </View>

          {/* lista de produtos */}
          {filteredProducts.length > 0 ? (
            <View style={styles.productsList}>
              {filteredProducts.map(product => {
                const isSelected = selectedIds.has(String(product.id));
                const eligible   = Boolean(product.eligible);
                const published  = Boolean(product.published_remotely);
                return (
                  <TouchableOpacity
                    key={product.id}
                    activeOpacity={eligible ? 0.8 : 1}
                    style={[
                      styles.productCard,
                      isSelected && styles.productCardSelected,
                      !eligible && styles.productCardBlocked,
                    ]}
                    onPress={() => eligible && toggleProduct(product.id)}>
                    <View style={styles.productCardLeft}>
                      <View style={[
                        styles.productCheckCircle,
                        { backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2' },
                      ]}>
                        <Icon
                          name={isSelected ? 'check-circle' : eligible ? 'circle' : 'x-circle'}
                          size={18}
                          color={isSelected ? '#16A34A' : eligible ? '#94A3B8' : '#DC2626'}
                        />
                      </View>
                    </View>
                    <View style={styles.productCardBody}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productPrice}>
                        {product.price > 0
                          ? `R$ ${product.price.toFixed(2).replace('.', ',')}`
                          : 'Sem preco'}
                      </Text>
                      {published && (
                        <Text style={styles.productRemoteState}>Publicado no iFood</Text>
                      )}
                      {!eligible && Array.isArray(product.blockers) && product.blockers.length > 0 && (
                        <Text style={styles.productBlockers}>{product.blockers.join(' · ')}</Text>
                      )}
                    </View>
                    {published && (
                      <Icon name="check-circle" size={14} color="#16A34A" style={styles.productRemoteIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsText}>Nenhum produto encontrado para este filtro.</Text>
            </View>
          )}

          {/* acoes do cardapio */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.menuUploadButton,
              { borderColor: brandColors.primary, backgroundColor: withOpacity(brandColors.primary, 0.08) },
              (!connected || actionLoading !== null || selectedEligible.length === 0) && styles.menuUploadButtonDisabled,
            ]}
            onPress={handleMenuUpload}
            disabled={!connected || actionLoading !== null || selectedEligible.length === 0}>
            {actionLoading === 'menu_upload'
              ? <ActivityIndicator color={brandColors.primary} size="small" />
              : (
                <>
                  <Icon name="upload-cloud" size={16} color={brandColors.primary} />
                  <Text style={[styles.menuUploadButtonText, { color: brandColors.primary }]}>
                    Publicar {selectedEligible.length > 0 ? `${selectedEligible.length} produto(s)` : 'selecionados'} no iFood
                  </Text>
                </>
              )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.menuUploadButton,
              { borderColor: '#0EA5E9', backgroundColor: withOpacity('#0EA5E9', 0.08) },
              (!connected || actionLoading !== null) && styles.menuUploadButtonDisabled,
            ]}
            onPress={handleCatalogSync}
            disabled={!connected || actionLoading !== null}>
            {actionLoading === 'catalog_sync'
              ? <ActivityIndicator color="#0EA5E9" size="small" />
              : (
                <>
                  <Icon name="download-cloud" size={16} color="#0EA5E9" />
                  <Text style={[styles.menuUploadButtonText, { color: '#0EA5E9' }]}>
                    Sincronizar catalogo do iFood
                  </Text>
                </>
              )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:       { padding: 16, paddingBottom: 32, gap: 14 },
  centerState:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  centerStateTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  heroCard:     { borderRadius: 22, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroCopy:     { flex: 1, paddingRight: 16 },
  heroEyebrow:  { color: '#E2E8F0', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle:    { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  heroText:     { color: '#DBEAFE', fontSize: 13, lineHeight: 18 },
  heroBadge:    { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroLogo:     { width: 24, height: 24 },
  sectionCard:  { borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  statusBadge:  { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  metaGrid:     { flexDirection: 'row', gap: 10 },
  metaBox:      { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  metaLabel:    { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  metaValue:    { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  helperRow:    { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10 },
  helperText:   { color: '#334155', fontSize: 13, lineHeight: 18 },
  errorBox:     { borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  errorTitle:   { color: '#B91C1C', fontSize: 12, fontWeight: '800' },
  errorText:    { color: '#991B1B', fontSize: 12, lineHeight: 16 },
  storesList:   { gap: 8 },
  storeCard:    { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  storeCardSelected: { borderColor: '#0284C7', backgroundColor: '#EFF6FF' },
  storeTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  storeName:    { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '700' },
  storeStatusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  storeStatusText: { fontSize: 11, fontWeight: '700' },
  storeCode:    { color: '#475569', fontSize: 12, fontWeight: '600' },
  emptyStores:  { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10 },
  emptyStoresText: { color: '#475569', fontSize: 13, lineHeight: 18 },
  inputLabel:   { color: '#334155', fontSize: 12, fontWeight: '700' },
  input:        { borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  actionsRow:   { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  actionButtonSecondary: { flex: 1, borderRadius: 12, height: 44, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionButtonSecondaryDisabled: { opacity: 0.5 },
  actionButtonSecondaryText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  syncButton:   { height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF' },
  syncButtonText: { fontSize: 13, fontWeight: '700' },
  selectedStoreBox: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  selectedStoreTitle: { color: '#334155', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  selectedStoreText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  menuHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  menuStatusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  menuStatusText: { fontSize: 11, fontWeight: '700' },
  menuHelperText: { color: '#334155', fontSize: 12, lineHeight: 17 },
  searchRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', paddingHorizontal: 10, height: 38 },
  searchIcon:   { marginRight: 6 },
  searchInput:  { flex: 1, color: '#0F172A', fontSize: 13 },
  filterTabsRow: { gap: 8, paddingVertical: 2 },
  filterTab:    { borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FFFFFF' },
  filterTabText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTabTextActive: { color: '#FFFFFF' },
  summaryRow:   { borderRadius: 10, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8 },
  summaryText:  { color: '#475569', fontSize: 12, fontWeight: '600' },
  productsList: { gap: 8 },
  productCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', padding: 12, gap: 10 },
  productCardSelected: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  productCardBlocked:  { opacity: 0.65 },
  productCardLeft: { alignItems: 'center', justifyContent: 'center' },
  productCheckCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  productCardBody: { flex: 1, gap: 2 },
  productName:  { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  productPrice: { color: '#475569', fontSize: 12, fontWeight: '600' },
  productRemoteState: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  productBlockers: { color: '#DC2626', fontSize: 11, fontWeight: '600' },
  productRemoteIcon: { marginLeft: 4 },
  emptyProducts: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', padding: 16, alignItems: 'center' },
  emptyProductsText: { color: '#64748B', fontSize: 13 },
  menuUploadButton: { height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  menuUploadButtonDisabled: { opacity: 0.55 },
  menuUploadButtonText: { fontSize: 13, fontWeight: '700' },
});

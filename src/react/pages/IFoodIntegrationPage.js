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
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
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

const DAY_LABELS = {
  MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta', FRIDAY: 'Sexta', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};
const DAY_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

const calcEndTime = (start, durationMin) => {
  if (!start || durationMin == null || durationMin === '') return '--:--';
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + Number(durationMin);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};

const calcDuration = (start, end) => {
  const [sh, sm] = (start || '00:00').split(':').map(Number);
  const [eh, em] = (end   || '23:59').split(':').map(Number);
  let d = (eh * 60 + em) - (sh * 60 + sm);
  if (d <= 0) d += 1440;
  return d;
};

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

const countCollection = collection => (Array.isArray(collection) ? collection.length : 0);

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
  const [storeStatus,      setStoreStatus]       = useState(null);
  const [previewVisible,   setPreviewVisible]    = useState(false);
  const [previewData,      setPreviewData]       = useState(null);
  const [itemStatusLoading, setItemStatusLoading] = useState(new Set());
  const [itemPriceEditing,  setItemPriceEditing]  = useState({});
  const [itemPriceLoading,  setItemPriceLoading]  = useState(new Set());

  const [hours,            setHours]            = useState(null);
  const [hoursLoading,     setHoursLoading]     = useState(false);
  const [hoursSaving,      setHoursSaving]      = useState(false);
  const [hoursEditing,     setHoursEditing]     = useState(false);
  const [hoursDraft,       setHoursDraft]       = useState(null);
  const [optStatusLoading, setOptStatusLoading] = useState(new Set());
  const [optPriceEditing,  setOptPriceEditing]  = useState({});
  const [optPriceLoading,  setOptPriceLoading]  = useState(new Set());

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

  /* ------------------------------------------------------------------ */
  /* horarios de funcionamento                                           */
  /* ------------------------------------------------------------------ */
  const loadHours = useCallback(async () => {
    if (!providerId) return;
    setHoursLoading(true);
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/store/hours', {
        params: { provider_id: providerId },
      });
      const raw = response?.result?.data?.shifts ?? response?.result?.data ?? response?.data ?? [];
      if (Array.isArray(raw) && raw.length > 0) {
        const groupByDay = (list) => list.reduce((acc, { dayOfWeek, start, duration }) => {
          let entry = acc.find(e => e.dayOfWeek === dayOfWeek);
          if (!entry) { entry = { dayOfWeek, shifts: [] }; acc.push(entry); }
          entry.shifts.push({ start: String(start).substring(0, 5), duration });
          return acc;
        }, []);

        let grouped;
        if (raw[0]?.dayOfWeek) {
          // Ja agrupado por dia: [{dayOfWeek, shifts:[...]}]
          grouped = raw;
        } else if (raw[0]?.shifts) {
          // iFood retornou outer wrapper: [{shifts:[{dayOfWeek,...}]}] — extrai e agrupa
          grouped = groupByDay(raw.flatMap(r => r.shifts || []));
        } else {
          // iFood retornou plano: [{dayOfWeek, start, duration}] — agrupa
          grouped = groupByDay(raw);
        }
        setHours(grouped);
      }
    } catch (_) { /* silencioso */ }
    finally { setHoursLoading(false); }
  }, [providerId]);

  const applyDetailResponse = useCallback((response, { syncSelection = false } = {}) => {
    setDetail(response || null);
    const integrationMerchantId = String(
      response?.integration?.ifood_code || response?.integration?.merchant_id || response?.selected_store?.merchant_id || '',
    );
    if (integrationMerchantId !== '') setMerchantIdInput(integrationMerchantId);

    if (response?.products) {
      setProductsResponse(response.products);
      if (syncSelection) {
        syncPublishedSelection(response.products?.products || []);
      }
    }

    if (response?.integration?.connected) loadHours();
  }, [syncPublishedSelection, loadHours]);

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

  const loadStoreStatus = useCallback(async () => {
    if (!providerId) return;
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/store/status', {
        params: { provider_id: providerId },
      });
      if (response?.result) setStoreStatus(response.result);
    } catch (_) { /* silencioso */ }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
      loadProducts();
      loadStoreStatus();
    }, [loadDetail, loadProducts, loadStoreStatus]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDetail({ refreshRemote: true }), loadProducts(), loadStoreStatus()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail, loadProducts, loadStoreStatus]);

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
      if (q) {
        const haystack = [
          p?.name,
          p?.description,
          p?.category?.name,
          p?.ifood_item_id,
          p?.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
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

  const handleMenuUpload = useCallback(async (selectedProducts = selectedEligible) => {
    if (!providerId) return;
    if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) {
      showInfo('Selecione ao menos um produto elegivel para publicar.');
      return;
    }
    await withAction('menu_upload', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/menu/upload', {
          method: 'POST',
          body: JSON.stringify({
            provider_id: providerId,
            product_ids: selectedProducts.map(p => p.id),
          }),
        });
        applyDetailResponse(response, { syncSelection: true });
        if (String(response?.result?.errno ?? '') === '0') {
          const pushed = response?.result?.data?.pushed_count ?? 0;
          showInfo(`Cardapio enviado ao iFood. ${pushed} produto(s) publicado(s).`);
          setPreviewVisible(false);
          return;
        }
        showError(formatApiError(response?.result || response));
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, selectedEligible, showError, showInfo, withAction]);

  const minimumRequiredItems = Number(productsResponse?.minimum_required_items || 1);

  const buildPreviewData = useCallback(() => {
    const categoriesMap = new Map();
    selectedEligible.forEach(product => {
      const categoryName = String(product?.category?.name || 'Sem categoria').trim();
      const current = categoriesMap.get(categoryName) || 0;
      categoriesMap.set(categoryName, current + 1);
    });

    const categories = Array.from(categoriesMap.entries()).map(([categoryName, count], index) => ({
      app_category_id: `${index + 1}`,
      category_name: categoryName,
      app_item_ids: Array.from({ length: count }).map((_, idx) => `${categoryName}-${idx + 1}`),
    }));

    return {
      eligible_product_count: selectedEligible.length,
      payload: {
        menus: selectedEligible.length > 0 ? [{ app_menu_id: 'ifood_default_menu' }] : [],
        categories,
        items: selectedEligible.map(product => ({
          app_item_id: String(product.id),
          item_name: product.name,
        })),
      },
    };
  }, [selectedEligible]);

  const handleOpenPreview = useCallback(() => {
    if (selectedEligible.length < minimumRequiredItems) {
      showInfo(`Selecione pelo menos ${minimumRequiredItems} produto(s) elegivel(is) para pre-visualizar.`);
      return;
    }
    setPreviewData(buildPreviewData());
    setPreviewVisible(true);
  }, [buildPreviewData, minimumRequiredItems, selectedEligible.length, showInfo]);

  const handleStoreOpen = useCallback(async () => {
    if (!providerId) return;
    await withAction('store_open', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/open', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId }),
        });
        if (response?.result) setStoreStatus(response.result);
        if (String(response?.result?.errno ?? '') === '0') {
          showInfo('Loja aberta para pedidos no iFood.');
          applyDetailResponse(response);
        } else {
          showError(formatApiError(response?.result || response));
        }
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleStoreClose = useCallback(async () => {
    if (!providerId) return;
    await withAction('store_close', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/close', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId }),
        });
        if (response?.result) setStoreStatus(response.result);
        if (String(response?.result?.errno ?? '') === '0') {
          showInfo('Loja fechada para pedidos no iFood.');
          applyDetailResponse(response);
        } else {
          showError(formatApiError(response?.result || response));
        }
      } catch (error) { showError(formatApiError(error)); }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleConnect = useCallback(async () => {
    if (!providerId) return;
    const merchantId = String(merchantIdInput || '').trim();
    if (!merchantId) { showInfo('Informe o código da loja iFood para conectar.'); return; }
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

  const handleItemStatusToggle = useCallback(async (product) => {
    if (!providerId || !product?.ifood_item_id) return;
    const itemId = product.ifood_item_id;
    const nextStatus = product.ifood_status === 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
    setItemStatusLoading(prev => new Set([...prev, itemId]));
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/item/status', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, item_id: itemId, status: nextStatus }),
      });
      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(prev => {
          if (!prev?.products) return prev;
          return {
            ...prev,
            products: prev.products.map(p =>
              p.ifood_item_id === itemId ? { ...p, ifood_status: nextStatus } : p
            ),
          };
        });
        showInfo(`Item ${nextStatus === 'AVAILABLE' ? 'disponivel' : 'indisponivel'} no iFood.`);
      } else {
        showError(formatApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setItemStatusLoading(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    }
  }, [providerId, showError, showInfo]);

  const handleItemPriceSave = useCallback(async (product) => {
    if (!providerId || !product?.ifood_item_id) return;
    const itemId = product.ifood_item_id;
    const raw = itemPriceEditing[itemId];
    const price = parseFloat(String(raw ?? '').replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      showError('Informe um preco valido maior que zero.');
      return;
    }
    setItemPriceLoading(prev => new Set([...prev, itemId]));
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/item/price', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, item_id: itemId, price }),
      });
      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(prev => {
          if (!prev?.products) return prev;
          return {
            ...prev,
            products: prev.products.map(p =>
              p.ifood_item_id === itemId ? { ...p, price } : p
            ),
          };
        });
        setItemPriceEditing(prev => { const n = { ...prev }; delete n[itemId]; return n; });
        showInfo('Preco atualizado no iFood.');
      } else {
        showError(formatApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setItemPriceLoading(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    }
  }, [itemPriceEditing, providerId, showError, showInfo]);

  const startEditHours = useCallback(() => {
    // Monta draft com todos os 7 dias — dias sem shifts = fechado
    const draft = DAY_ORDER.map(day => {
      const existing = (hours || []).find(h => h.dayOfWeek === day);
      const isOpen   = !!existing && (existing.shifts || []).length > 0;
      const shifts   = isOpen ? existing.shifts : [{ start: '09:00', duration: 840 }];
      return { dayOfWeek: day, open: isOpen, shifts };
    });
    setHoursDraft(draft);
    setHoursEditing(true);
  }, [hours]);

  const cancelEditHours = useCallback(() => {
    setHoursEditing(false);
    setHoursDraft(null);
  }, []);

  const updateHoursDraft = useCallback((dayOfWeek, shiftIdx, field, value) => {
    setHoursDraft(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(day => {
        if (day.dayOfWeek !== dayOfWeek) return day;
        if (field === 'open') return { ...day, open: value };
        const shifts = (day.shifts || []).map((s, i) => {
          if (i !== shiftIdx) return s;
          if (field === 'end') return { ...s, duration: calcDuration(s.start, value) };
          return { ...s, [field]: value };
        });
        return { ...day, shifts };
      });
    });
  }, []);

  const saveHours = useCallback(async () => {
    if (!providerId || !hoursDraft) return;
    setHoursSaving(true);
    try {
      // Converte draft para flat shifts — apenas dias com open=true
      const flatShifts = (hoursDraft || [])
        .filter(d => d.open)
        .flatMap(d => (d.shifts || []).map(s => ({
          dayOfWeek: d.dayOfWeek,
          start:     /^\d{2}:\d{2}$/.test(s.start) ? s.start + ':00' : s.start,
          duration:  Number(s.duration) || 840,
        })));

      const response = await api.fetch('/marketplace/integrations/ifood/store/hours', {
        method: 'PUT',
        body: JSON.stringify({ provider_id: providerId, shifts: flatShifts }),
      });
      if (String(response?.result?.errno ?? response?.errno ?? '') === '0') {
        // Reconstroi hours agrupado para exibicao
        const grouped = flatShifts.reduce((acc, { dayOfWeek, start, duration }) => {
          let entry = acc.find(e => e.dayOfWeek === dayOfWeek);
          if (!entry) { entry = { dayOfWeek, shifts: [] }; acc.push(entry); }
          entry.shifts.push({ start: String(start).substring(0, 5), duration });
          return acc;
        }, []);
        setHours(grouped);
        setHoursEditing(false);
        setHoursDraft(null);
        showInfo('Horarios de funcionamento atualizados no iFood.');
      } else {
        showError(formatApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setHoursSaving(false);
    }
  }, [hoursDraft, providerId, showError, showInfo]);

  /* ------------------------------------------------------------------ */
  /* opcoes / complementos iFood                                         */
  /* ------------------------------------------------------------------ */
  const handleOptionStatusToggle = useCallback(async (product, opt) => {
    if (!providerId || !opt?.ifood_option_id) return;
    const optionId   = opt.ifood_option_id;
    const nextStatus = opt.ifood_status === 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
    setOptStatusLoading(prev => new Set([...prev, optionId]));
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/option/status', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, option_id: optionId, status: nextStatus }),
      });
      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(prev => {
          if (!prev?.products) return prev;
          return {
            ...prev,
            products: prev.products.map(p =>
              p.id === product.id
                ? {
                    ...p,
                    options: (p.options || []).map(o =>
                      o.ifood_option_id === optionId ? { ...o, ifood_status: nextStatus } : o
                    ),
                  }
                : p
            ),
          };
        });
        showInfo(`Complemento ${nextStatus === 'AVAILABLE' ? 'disponivel' : 'indisponivel'} no iFood.`);
      } else {
        showError(formatApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setOptStatusLoading(prev => { const s = new Set(prev); s.delete(optionId); return s; });
    }
  }, [providerId, showError, showInfo]);

  const handleOptionPriceSave = useCallback(async (product, opt) => {
    if (!providerId || !opt?.ifood_option_id) return;
    const optionId = opt.ifood_option_id;
    const raw      = optPriceEditing[optionId];
    const price    = parseFloat(String(raw ?? '').replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      showError('Informe um preco valido maior que zero.');
      return;
    }
    setOptPriceLoading(prev => new Set([...prev, optionId]));
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/option/price', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, option_id: optionId, price }),
      });
      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(prev => {
          if (!prev?.products) return prev;
          return {
            ...prev,
            products: prev.products.map(p =>
              p.id === product.id
                ? {
                    ...p,
                    options: (p.options || []).map(o =>
                      o.ifood_option_id === optionId ? { ...o, price } : o
                    ),
                  }
                : p
            ),
          };
        });
        setOptPriceEditing(prev => { const n = { ...prev }; delete n[optionId]; return n; });
        showInfo('Preco do complemento atualizado no iFood.');
      } else {
        showError(formatApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setOptPriceLoading(prev => { const s = new Set(prev); s.delete(optionId); return s; });
    }
  }, [optPriceEditing, providerId, showError, showInfo]);

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
  const ifoodCode      = String(integration?.ifood_code || integration?.merchant_id || '');
  const selectedStore  = detail?.selected_store || stores.find(
    s => String(s?.merchant_id || '') === ifoodCode,
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
                  : 'Selecione uma loja ou informe o código iFood para conectar.'}
            </Text>
          </View>

          {!!integration?.last_error_message && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Ultimo erro</Text>
              <Text style={styles.errorText}>{integration.last_error_message}</Text>
            </View>
          )}
        </View>

        {/* disponibilidade */}
        {connected && (
          <View style={[styles.sectionCard, shadowStyle]}>
            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>Disponibilidade da loja</Text>
              {storeStatus?.data != null && (
                <View style={[styles.availBadge, {
                  backgroundColor: withOpacity(storeStatus.data.online ? '#16A34A' : '#DC2626', 0.12),
                }]}>
                  <View style={[styles.availDot, { backgroundColor: storeStatus.data.online ? '#16A34A' : '#DC2626' }]} />
                  <Text style={[styles.availBadgeText, { color: storeStatus.data.online ? '#166534' : '#991B1B' }]}>
                    {storeStatus.data.online ? 'Online' : 'Offline'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.helperText}>
              {storeStatus?.data != null
                ? storeStatus.data.online
                  ? 'A loja esta aceitando pedidos no iFood.'
                  : `A loja esta fechada para novos pedidos.${Array.isArray(storeStatus.data.interruptions) && storeStatus.data.interruptions.length > 0 ? ` ${storeStatus.data.interruptions.length} interrupcao(oes) ativa(s).` : ''}`
                : 'Consulte ou altere a disponibilidade da loja para receber pedidos.'}
            </Text>

            {/* operacoes — oculta chips ERROR quando a loja ja esta offline (redundante com o badge) */}
            {Array.isArray(storeStatus?.data?.operations) && (() => {
              const storeOnline = storeStatus.data.online === true;
              const visibleOps  = storeStatus.data.operations.filter(op => storeOnline || op.state !== 'ERROR');
              if (visibleOps.length === 0) return null;
              return (
                <View style={styles.opsGrid}>
                  {visibleOps.map((op, i) => {
                    const opOnline = op.state === 'OK' || op.state === 'WARNING';
                    const opColor  = op.state === 'OK' ? '#16A34A' : op.state === 'WARNING' ? '#D97706' : '#DC2626';
                    return (
                      <View key={i} style={[styles.opChip, { borderColor: withOpacity(opColor, 0.3), backgroundColor: withOpacity(opColor, 0.08) }]}>
                        <Icon name={opOnline ? 'check-circle' : 'x-circle'} size={12} color={opColor} />
                        <Text style={[styles.opChipText, { color: opColor }]}>
                          {op.operation}{op.sales_channel ? ` · ${op.sales_channel}` : ''}: {op.state_label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            <View style={styles.availRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.availButton, { backgroundColor: '#16A34A' },
                  (actionLoading === 'store_open' || storeStatus?.data?.online === true) && styles.availButtonDisabled,
                ]}
                onPress={handleStoreOpen}
                disabled={actionLoading !== null || storeStatus?.data?.online === true}>
                {actionLoading === 'store_open'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Icon name="check-circle" size={15} color="#fff" /><Text style={styles.availButtonText}>Abrir loja</Text></>}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.availButton, { backgroundColor: '#DC2626' },
                  (actionLoading === 'store_close' || storeStatus?.data?.online === false) && styles.availButtonDisabled,
                ]}
                onPress={handleStoreClose}
                disabled={actionLoading !== null || storeStatus?.data?.online === false}>
                {actionLoading === 'store_close'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Icon name="x-circle" size={15} color="#fff" /><Text style={styles.availButtonText}>Fechar loja</Text></>}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.availRefreshButton}
                onPress={loadStoreStatus}
                disabled={actionLoading !== null}>
                <Icon name="refresh-cw" size={15} color="#64748B" />
              </TouchableOpacity>
            </View>

            {storeStatus?.errno !== 0 && storeStatus?.errno != null && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Erro ao consultar disponibilidade</Text>
                <Text style={styles.errorText}>{storeStatus.errmsg}</Text>
              </View>
            )}
          </View>
        )}

        {/* horarios de funcionamento */}
        {connected && (
          <View style={[styles.sectionCard, shadowStyle]}>
            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>Horarios de funcionamento</Text>
              {!hoursEditing && (
                <TouchableOpacity
                  onPress={startEditHours}
                  style={styles.hoursEditBtn}
                  disabled={hoursLoading}>
                  <Icon name="edit-2" size={13} color="#0EA5E9" />
                  <Text style={styles.hoursEditBtnText}>Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            {hoursLoading && (
              <ActivityIndicator size="small" color="#0EA5E9" />
            )}

            {!hoursLoading && !hoursEditing && (
              Array.isArray(hours) && hours.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {DAY_ORDER.map(day => {
                    const entry  = hours.find(h => h.dayOfWeek === day);
                    const isOpen = !!entry && (entry.shifts || []).length > 0;
                    return (
                      <View key={day} style={styles.hoursDayRow}>
                        <Text style={[styles.hoursDayLabel, !isOpen && { color: '#94A3B8' }]}>{DAY_LABELS[day]}</Text>
                        <View style={{ flex: 1, gap: 2 }}>
                          {isOpen
                            ? (entry.shifts || []).map((s, i) => (
                                <Text key={i} style={styles.hoursValue}>
                                  {s.start} – {calcEndTime(s.start, s.duration)}
                                </Text>
                              ))
                            : <Text style={styles.hoursClosed}>Fechado</Text>
                          }
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.helperText}>Nenhum horario configurado. Toque em Editar para definir.</Text>
              )
            )}

            {hoursEditing && Array.isArray(hoursDraft) && (
              hoursDraft.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {DAY_ORDER.map(day => {
                    const entry = hoursDraft.find(h => h.dayOfWeek === day) || { dayOfWeek: day, open: false, shifts: [{ start: '09:00', duration: 840 }] };
                    return (
                      <View key={day} style={[styles.hoursDayRow, { alignItems: 'center' }]}>
                        {/* Toggle aberto/fechado */}
                        <TouchableOpacity
                          onPress={() => updateHoursDraft(day, null, 'open', !entry.open)}
                          disabled={hoursSaving}
                          style={[styles.dayToggle, entry.open && styles.dayToggleOn]}>
                          <View style={[styles.dayToggleThumb, entry.open && styles.dayToggleThumbOn]} />
                        </TouchableOpacity>
                        <Text style={[styles.hoursDayLabel, !entry.open && { color: '#94A3B8' }]}>{DAY_LABELS[day]}</Text>
                        {entry.open ? (
                          <View style={{ flex: 1, gap: 6 }}>
                            {(entry.shifts || []).map((s, i) => (
                              <View key={i} style={styles.hoursInputRow}>
                                <TextInput
                                  value={s.start}
                                  onChangeText={v => updateHoursDraft(day, i, 'start', v)}
                                  style={styles.hoursInput}
                                  placeholder="HH:MM"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="numbers-and-punctuation"
                                  editable={!hoursSaving}
                                />
                                <Text style={styles.hoursSep}>–</Text>
                                <TextInput
                                  value={calcEndTime(s.start, s.duration)}
                                  onChangeText={v => updateHoursDraft(day, i, 'end', v)}
                                  style={styles.hoursInput}
                                  placeholder="HH:MM"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="numbers-and-punctuation"
                                  editable={!hoursSaving}
                                />
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.hoursClosed}>Fechado</Text>
                        )}
                      </View>
                    );
                  })}
                  <View style={styles.availRow}>
                    <TouchableOpacity
                      onPress={saveHours}
                      disabled={hoursSaving}
                      style={[styles.actionButton, { backgroundColor: '#16A34A' }]}>
                      {hoursSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Icon name="check" size={15} color="#fff" /><Text style={styles.actionButtonText}>Salvar horarios</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={cancelEditHours}
                      disabled={hoursSaving}
                      style={styles.hoursCancelBtn}>
                      <Text style={styles.hoursCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.helperRow}>
                    <Text style={styles.helperText}>
                      Nenhum horario retornado pelo iFood. Sincronize o catalogo e tente novamente.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={cancelEditHours}
                    style={styles.hoursCancelBtn}>
                    <Text style={styles.hoursCancelText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        )}

        {/* lojas */}
        <View style={[styles.sectionCard, shadowStyle]}>
          <Text style={styles.sectionTitle}>Lojas disponiveis no iFood</Text>

          {stores.length > 0 ? (
            <View style={styles.storesList}>
              {stores.map(store => {
                const sid      = String(store?.merchant_id || '');
                const selected = sid !== '' && (sid === merchantIdInput || sid === ifoodCode);
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
                    <Text style={styles.storeCode}>código: {sid}</Text>
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

          <Text style={styles.inputLabel}>Código iFood para vinculação</Text>
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
              <Text style={styles.selectedStoreText}>código: {selectedStore?.merchant_id}</Text>
            </View>
          )}
        </View>

        {/* cardapio / catalogo */}
        <View style={[styles.sectionCard, shadowStyle]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cardapio iFood</Text>
            <View style={[
              styles.selectionBadge,
              { backgroundColor: withOpacity(connected ? '#16A34A' : '#F59E0B', 0.12) },
            ]}>
              <Text style={[styles.selectionBadgeText, { color: connected ? '#166534' : '#92400E' }]}>
                {connected ? 'Pronto para publicar' : 'Conecte a loja'}
              </Text>
            </View>
          </View>
          <Text style={styles.catalogHint}>
            Escolha pelo menos {minimumRequiredItems} produto(s) elegiveis para o menu do iFood.
          </Text>

          {/* busca */}
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar produto, categoria ou codigo"
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
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: withOpacity(brandColors.primary, 0.12), borderColor: withOpacity(brandColors.primary, 0.25) },
                  ]}
                  onPress={() => setFilterKey(tab.key)}>
                  <Text style={[styles.filterChipText, active && { color: brandColors.primary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* resumo + botao upload */}
          <View style={styles.selectionSummaryRow}>
            <Text style={styles.selectionSummaryText}>
              {eligibleCount} produtos aptos no cadastro atual
            </Text>
            <TouchableOpacity
              style={[
                styles.previewButton,
                {
                  backgroundColor: (connected && selectedEligible.length >= minimumRequiredItems)
                    ? brandColors.primary
                    : '#CBD5E1',
                },
              ]}
              onPress={handleOpenPreview}
              disabled={!connected || actionLoading !== null || selectedEligible.length < minimumRequiredItems}>
              {actionLoading === 'menu_upload'
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <>
                    <Icon name="eye" size={15} color="#fff" />
                    <Text style={styles.previewButtonText}>Pre-visualizar menu</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>

          {/* lista de produtos */}
          {filteredProducts.length > 0 ? (
            <View style={styles.productsList}>
              {filteredProducts.map(product => {
                const isSelected  = selectedIds.has(String(product.id));
                const eligible    = Boolean(product.eligible);
                const published   = Boolean(product.published_remotely);
                const itemId      = product.ifood_item_id || null;
                const ifoodStatus = product.ifood_status || 'AVAILABLE';
                const isAvailable = ifoodStatus !== 'UNAVAILABLE';
                const statusBusy  = itemStatusLoading.has(itemId);
                const priceBusy   = itemPriceLoading.has(itemId);
                const draftPrice  = itemId ? itemPriceEditing[itemId] : undefined;
                const editingPrice = draftPrice !== undefined;
                return (
                  <TouchableOpacity
                    key={product.id}
                    activeOpacity={0.88}
                    style={[
                      styles.productCard,
                      isSelected && { borderColor: brandColors.primary, backgroundColor: withOpacity(brandColors.primary, 0.04) },
                    ]}
                    onPress={() => toggleProduct(product.id)}>
                    <View style={styles.productMain}>
                      {product.cover_image_url ? (
                        <Image
                          source={{ uri: product.cover_image_url }}
                          style={styles.productThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productStatusIcon, { backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2' }]}>
                          <Icon
                            name={isSelected ? 'check-circle' : eligible ? 'circle' : 'x-circle'}
                            size={16}
                            color={isSelected ? brandColors.primary : eligible ? '#16A34A' : '#DC2626'}
                          />
                        </View>
                      )}
                      <View style={styles.productContent}>
                        <View style={styles.productTitleRow}>
                          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                          {published && itemId ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={(e) => { e.stopPropagation?.(); handleItemStatusToggle(product); }}
                              disabled={statusBusy}
                              style={[
                                styles.itemStatusBadge,
                                { backgroundColor: isAvailable ? '#DCFCE7' : '#FEE2E2' },
                              ]}>
                              {statusBusy
                                ? <ActivityIndicator size={10} color={isAvailable ? '#16A34A' : '#DC2626'} />
                                : <Text style={[styles.itemStatusText, { color: isAvailable ? '#15803D' : '#B91C1C' }]}>
                                    {isAvailable ? 'Ativo' : 'Inativo'}
                                  </Text>}
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.productPrice}>R$ {Number(product.price || 0).toFixed(2)}</Text>
                          )}
                        </View>

                        <Text style={styles.productMeta} numberOfLines={1}>
                          {product.category?.name || 'Sem categoria'} • {product.type || 'produto'}
                        </Text>
                        {!!product.description && (
                          <Text style={styles.productDescription} numberOfLines={1}>{product.description}</Text>
                        )}

                        {published && itemId ? (
                          <View style={styles.priceEditRow}>
                            {editingPrice ? (
                              <>
                                <TextInput
                                  value={String(draftPrice)}
                                  onChangeText={v => setItemPriceEditing(prev => ({ ...prev, [itemId]: v }))}
                                  keyboardType="decimal-pad"
                                  style={styles.priceInput}
                                  placeholder="0.00"
                                  placeholderTextColor="#94A3B8"
                                  onSubmitEditing={() => handleItemPriceSave(product)}
                                />
                                <TouchableOpacity
                                  onPress={(e) => { e.stopPropagation?.(); handleItemPriceSave(product); }}
                                  disabled={priceBusy}
                                  style={styles.priceSaveButton}>
                                  {priceBusy
                                    ? <ActivityIndicator size={12} color="#fff" />
                                    : <Icon name="check" size={13} color="#fff" />}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={(e) => { e.stopPropagation?.(); setItemPriceEditing(prev => { const n = { ...prev }; delete n[itemId]; return n; }); }}
                                  style={styles.priceCancelButton}>
                                  <Icon name="x" size={13} color="#64748B" />
                                </TouchableOpacity>
                              </>
                            ) : (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setItemPriceEditing(prev => ({ ...prev, [itemId]: String(product.price ?? '') }));
                                }}
                                style={styles.priceEditTrigger}>
                                <Text style={styles.priceEditText}>R$ {Number(product.price || 0).toFixed(2)}</Text>
                                <Icon name="edit-2" size={11} color="#64748B" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : null}

                        {!!itemId && (
                          <Text style={styles.productCode}>ID iFood: {itemId.slice(0, 8)}...</Text>
                        )}
                        {published && (
                          <Text style={styles.productRemoteState}>Publicado no catalogo iFood</Text>
                        )}
                        {!eligible && Array.isArray(product.blockers) && product.blockers.length > 0 && (
                          <Text style={styles.productBlocker}>{product.blockers.join(' • ')}</Text>
                        )}

                        {/* complementos iFood */}
                        {published && Array.isArray(product.options) && product.options.length > 0 && (
                          <View style={styles.optionsSection}>
                            <Text style={styles.optionsSectionLabel}>Complementos iFood</Text>
                            {product.options.map((opt, oi) => {
                              const hasIfoodId  = !!opt.ifood_option_id;
                              const oId         = opt.ifood_option_id || null;
                              const oAvail      = opt.ifood_status !== 'UNAVAILABLE';
                              const oBusy       = oId ? optStatusLoading.has(oId) : false;
                              const oPriceBusy  = oId ? optPriceLoading.has(oId) : false;
                              const oDraftPrice = oId ? optPriceEditing[oId] : undefined;
                              const oEditing    = oDraftPrice !== undefined;
                              return (
                                <View key={oi} style={styles.optionRow}>
                                  <View style={styles.optionInfo}>
                                    <Text style={styles.optionName} numberOfLines={1}>{opt.name || `Complemento ${oi + 1}`}</Text>
                                    {!hasIfoodId && (
                                      <Text style={styles.optNoIfoodId}>Sem ID iFood</Text>
                                    )}
                                  </View>
                                  {hasIfoodId && (
                                    <View style={styles.optionControls}>
                                      {oEditing ? (
                                        <>
                                          <TextInput
                                            value={String(oDraftPrice)}
                                            onChangeText={v => setOptPriceEditing(prev => ({ ...prev, [oId]: v }))}
                                            keyboardType="decimal-pad"
                                            style={styles.priceInput}
                                            placeholder="0.00"
                                            placeholderTextColor="#94A3B8"
                                            onSubmitEditing={(e) => { e.stopPropagation?.(); handleOptionPriceSave(product, opt); }}
                                          />
                                          <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation?.(); handleOptionPriceSave(product, opt); }}
                                            disabled={oPriceBusy}
                                            style={styles.priceSaveButton}>
                                            {oPriceBusy
                                              ? <ActivityIndicator size={12} color="#fff" />
                                              : <Icon name="check" size={13} color="#fff" />}
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation?.(); setOptPriceEditing(prev => { const n = { ...prev }; delete n[oId]; return n; }); }}
                                            style={styles.priceCancelButton}>
                                            <Icon name="x" size={13} color="#64748B" />
                                          </TouchableOpacity>
                                        </>
                                      ) : (
                                        <TouchableOpacity
                                          onPress={(e) => { e.stopPropagation?.(); setOptPriceEditing(prev => ({ ...prev, [oId]: String(opt.price ?? '') })); }}
                                          style={styles.priceEditTrigger}>
                                          <Text style={styles.priceEditText}>R$ {Number(opt.price || 0).toFixed(2)}</Text>
                                          <Icon name="edit-2" size={11} color="#64748B" />
                                        </TouchableOpacity>
                                      )}
                                      <TouchableOpacity
                                        onPress={(e) => { e.stopPropagation?.(); handleOptionStatusToggle(product, opt); }}
                                        disabled={oBusy}
                                        style={[styles.optStatusBadge, { backgroundColor: oAvail ? '#DCFCE7' : '#FEE2E2' }]}>
                                        {oBusy
                                          ? <ActivityIndicator size={10} color={oAvail ? '#16A34A' : '#DC2626'} />
                                          : <Text style={[styles.itemStatusText, { color: oAvail ? '#15803D' : '#B91C1C' }]}>
                                              {oAvail ? 'Ativo' : 'Inativo'}
                                            </Text>}
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsText}>Nenhum produto encontrado para este filtro.</Text>
            </View>
          )}

          {/* sincronizar catalogo */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.syncCatalogButton,
              (!connected || actionLoading !== null) && styles.syncCatalogButtonDisabled,
            ]}
            onPress={handleCatalogSync}
            disabled={!connected || actionLoading !== null}>
            {actionLoading === 'catalog_sync'
              ? <ActivityIndicator color="#0EA5E9" size="small" />
              : (
                <>
                  <Icon name="download-cloud" size={15} color="#0EA5E9" />
                  <Text style={styles.syncCatalogButtonText}>Sincronizar catalogo do iFood</Text>
                </>
              )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      <AnimatedModal visible={previewVisible} onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalShell}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pre-visualizacao do menu</Text>
                <Text style={styles.modalSubtitle}>
                  {previewData?.eligible_product_count || selectedEligible.length} produtos prontos para upload
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.modalCloseButton}>
                <Icon name="x" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <View style={styles.modalSummaryGrid}>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.menus)}</Text>
                  <Text style={styles.modalSummaryLabel}>Menus</Text>
                </View>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.categories)}</Text>
                  <Text style={styles.modalSummaryLabel}>Categorias</Text>
                </View>
                <View style={styles.modalSummaryCard}>
                  <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.items)}</Text>
                  <Text style={styles.modalSummaryLabel}>Itens</Text>
                </View>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Categorias</Text>
                {(previewData?.payload?.categories || []).map(category => (
                  <View key={category.app_category_id} style={styles.previewLine}>
                    <Text style={styles.previewLineTitle}>{category.category_name}</Text>
                    <Text style={styles.previewLineMeta}>{countCollection(category.app_item_ids)} item(ns)</Text>
                  </View>
                ))}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Itens selecionados</Text>
                {selectedEligible.map(product => (
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
                onPress={() => handleMenuUpload(selectedEligible)}
                disabled={actionLoading === 'menu_upload'}>
                {actionLoading === 'menu_upload' ? (
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
  catalogHint: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: -2,
  },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectionBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  selectionBadgeText: { fontSize: 12, fontWeight: '700' },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'web' ? 12 : 4, marginBottom: 14, backgroundColor: '#F8FAFC' },
  searchInput:  { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 10 },
  filterTabsRow: { paddingBottom: 6, gap: 8 },
  filterChip:   { borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8 },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  selectionSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8, marginBottom: 16 },
  selectionSummaryText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },
  previewButton: { minHeight: 42, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  productsList: { gap: 10 },
  productCard:  { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 14, backgroundColor: '#fff' },
  productMain:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  productStatusIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  productThumb: { width: 44, height: 44, borderRadius: 10, marginTop: 2, backgroundColor: '#F1F5F9' },
  productContent: { flex: 1, minWidth: 0 },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  productName:  { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  productPrice: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  productMeta:  { fontSize: 12, color: '#64748B', marginBottom: 4 },
  productDescription: { fontSize: 12, color: '#475569', marginBottom: 4 },
  productCode:  { fontSize: 11, color: '#1D4ED8', fontWeight: '700' },
  productRemoteState: { fontSize: 11, color: '#15803D', fontWeight: '700', marginTop: 4 },
  productBlocker: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 4 },
  itemStatusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  itemStatusText: { fontSize: 11, fontWeight: '800' },
  priceEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  priceEditTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceEditText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  priceInput: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC', maxWidth: 100 },
  priceSaveButton: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  priceCancelButton: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyProducts: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', padding: 16, alignItems: 'center' },
  emptyProductsText: { color: '#64748B', fontSize: 13 },
  syncCatalogButton: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#0EA5E9', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  syncCatalogButtonDisabled: { opacity: 0.5 },
  syncCatalogButtonText: { fontSize: 13, fontWeight: '700', color: '#0EA5E9' },
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
  modalPrimaryButton: {
    flex: 1.4,
  },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  availDot:   { width: 7, height: 7, borderRadius: 999 },
  availBadgeText: { fontSize: 12, fontWeight: '700' },
  opsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  opChipText: { fontSize: 11, fontWeight: '700' },
  availRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  availButton: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  availButtonDisabled: { opacity: 0.45 },
  availButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  availRefreshButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },

  hoursEditBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 5 },
  hoursEditBtnText:  { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
  hoursDayRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hoursDayLabel:     { width: 72, fontSize: 13, fontWeight: '700', color: '#334155', paddingTop: 2 },
  hoursValue:        { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  hoursClosed:       { fontSize: 12, color: '#94A3B8', fontWeight: '600', fontStyle: 'italic', paddingTop: 2 },
  hoursInputRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hoursInput:        { width: 70, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC' },
  hoursSep:          { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  hoursCancelBtn:    { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  hoursCancelText:   { fontSize: 13, fontWeight: '700', color: '#64748B' },
  dayToggle:         { width: 34, height: 20, borderRadius: 10, backgroundColor: '#E2E8F0', paddingHorizontal: 2, justifyContent: 'center' },
  dayToggleOn:       { backgroundColor: '#16A34A' },
  dayToggleThumb:    { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  dayToggleThumbOn:  { marginLeft: 'auto' },

  optionsSection:       { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  optionsSectionLabel:  { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  optionRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  optionInfo:           { flex: 1, minWidth: 0 },
  optionName:           { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  optionControls:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optStatusBadge:       { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  optNoIfoodId:         { fontSize: 10, color: '#94A3B8', fontWeight: '600', fontStyle: 'italic' },
});

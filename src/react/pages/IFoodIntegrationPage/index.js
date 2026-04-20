import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { getOrderChannelLogo } from '@assets/ppc/channels';

import IntegrationHero from '../../components/integrations/IntegrationHero';
import IntegrationTabs from '../../components/integrations/IntegrationTabs';
import { integrationCardShadowStyle } from '../../utils/integrationPage';
import IFoodCatalogTab from './components/IFoodCatalogTab';
import IFoodOperationsTab from './components/IFoodOperationsTab';
import IFoodOverviewTab from './components/IFoodOverviewTab';
import IFoodPreviewModal from './components/IFoodPreviewModal';
import IFoodStoreTab from './components/IFoodStoreTab';
import styles from './styles';
import {
  calcDuration,
  DAY_ORDER,
  filterTabs,
  formatIFoodApiError,
} from './utils';

// Página principal da integração iFood, agora reduzida a orquestração.
export default function IFoodIntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showInfo } = useToastMessage();

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const providerId = currentCompany?.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [detail, setDetail] = useState(null);
  const [productsResponse, setProductsResponse] = useState(null);
  const [merchantIdInput, setMerchantIdInput] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterKey, setFilterKey] = useState('all');
  const [search, setSearch] = useState('');
  const [storeStatus, setStoreStatus] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [itemStatusLoading, setItemStatusLoading] = useState(new Set());
  const [itemPriceEditing, setItemPriceEditing] = useState({});
  const [itemPriceLoading, setItemPriceLoading] = useState(new Set());
  const [hours, setHours] = useState(null);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursEditing, setHoursEditing] = useState(false);
  const [hoursDraft, setHoursDraft] = useState(null);
  const [optStatusLoading, setOptStatusLoading] = useState(new Set());
  const [optPriceEditing, setOptPriceEditing] = useState({});
  const [optPriceLoading, setOptPriceLoading] = useState(new Set());
  const ignoreNextProductCardPressRef = useRef(false);

  // Lista local de produtos retornados pela API do iFood.
  const products = useMemo(
    () => (Array.isArray(productsResponse?.products) ? productsResponse.products : []),
    [productsResponse],
  );

  const syncPublishedSelection = useCallback(productList => {
    const ids = (Array.isArray(productList) ? productList : [])
      .filter(product => product?.eligible && product?.published_remotely)
      .map(product => String(product.id));
    setSelectedIds(new Set(ids));
  }, []);

  const loadHours = useCallback(async () => {
    if (!providerId) return;

    setHoursLoading(true);
    try {
      const response = await api.fetch('/marketplace/integrations/ifood/store/hours', {
        params: { provider_id: providerId },
      });
      const raw = response?.result?.data?.shifts ?? response?.result?.data ?? response?.data ?? [];

      if (Array.isArray(raw) && raw.length > 0) {
        const groupByDay = list =>
          list.reduce((accumulator, { dayOfWeek, start, duration }) => {
            let entry = accumulator.find(item => item.dayOfWeek === dayOfWeek);
            if (!entry) {
              entry = { dayOfWeek, shifts: [] };
              accumulator.push(entry);
            }
            entry.shifts.push({ start: String(start).substring(0, 5), duration });
            return accumulator;
          }, []);

        let grouped;
        if (raw[0]?.dayOfWeek && Array.isArray(raw[0]?.shifts)) {
          grouped = raw;
        } else if (!raw[0]?.dayOfWeek && raw[0]?.shifts) {
          grouped = groupByDay(raw.flatMap(item => item.shifts || []));
        } else {
          grouped = groupByDay(raw);
        }

        setHours(grouped);
      }
    } catch (_) {
      // Horário é complementar. A tela continua funcionando sem esse dado.
    } finally {
      setHoursLoading(false);
    }
  }, [providerId]);

  const applyDetailResponse = useCallback((response, { syncSelection = false } = {}) => {
    setDetail(response || null);

    const integrationMerchantId = String(
      response?.integration?.ifood_code ||
      response?.integration?.merchant_id ||
      response?.selected_store?.merchant_id ||
      '',
    );

    if (integrationMerchantId !== '') {
      setMerchantIdInput(integrationMerchantId);
    }

    if (response?.products) {
      setProductsResponse(response.products);
      if (syncSelection) {
        syncPublishedSelection(response.products?.products || []);
      }
    }

    if (response?.integration?.connected) {
      loadHours();
    }
  }, [loadHours, syncPublishedSelection]);

  const loadDetail = useCallback(async ({ refreshRemote = false } = {}) => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    try {
      const params = { provider_id: providerId };
      if (refreshRemote) params.refresh_remote = 1;
      const response = await api.fetch('/marketplace/integrations/ifood/detail', { params });
      applyDetailResponse(response);
    } catch (error) {
      showError(formatIFoodApiError(error));
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
      showError(formatIFoodApiError(error));
    }
  }, [providerId, showError, syncPublishedSelection]);

  const loadStoreStatus = useCallback(async () => {
    if (!providerId) return;

    try {
      const response = await api.fetch('/marketplace/integrations/ifood/store/status', {
        params: { provider_id: providerId },
      });
      if (response?.result) setStoreStatus(response.result);
    } catch (_) {
      // Status remoto não deve bloquear a navegação da tela.
    }
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
      await Promise.all([
        loadDetail({ refreshRemote: true }),
        loadProducts(),
        loadStoreStatus(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail, loadProducts, loadStoreStatus]);

  const withAction = useCallback(async (actionName, callback) => {
    setActionLoading(actionName);
    try {
      await callback();
    } finally {
      setActionLoading(null);
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter(product => {
      if (filterKey === 'eligible' && !product.eligible) return false;
      if (filterKey === 'blocked' && product.eligible) return false;
      if (filterKey === 'selected' && !selectedIds.has(String(product.id))) return false;

      if (query) {
        const haystack = [
          product?.name,
          product?.description,
          product?.category?.name,
          product?.ifood_item_id,
          product?.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [filterKey, products, search, selectedIds]);

  const toggleProduct = useCallback(id => {
    const key = String(id);
    setSelectedIds(current => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const markNextProductCardPressAsHandled = useCallback(() => {
    ignoreNextProductCardPressRef.current = true;

    const release = () => {
      ignoreNextProductCardPressRef.current = false;
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(release);
      return;
    }

    setTimeout(release, 0);
  }, []);

  const blockNextProductCardPress = useCallback(event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    markNextProductCardPressAsHandled();
  }, [markNextProductCardPressAsHandled]);

  const handleProductCardPress = useCallback(id => {
    if (ignoreNextProductCardPressRef.current) {
      ignoreNextProductCardPressRef.current = false;
      return;
    }

    toggleProduct(id);
  }, [toggleProduct]);

  const selectedEligible = useMemo(
    () => products.filter(product => product.eligible && selectedIds.has(String(product.id))),
    [products, selectedIds],
  );

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
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
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
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
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
            product_ids: selectedProducts.map(product => product.id),
          }),
        });

        applyDetailResponse(response, { syncSelection: true });
        if (String(response?.result?.errno ?? '') === '0') {
          const pushed = response?.result?.data?.pushed_count ?? 0;
          showInfo(`Cardapio enviado ao iFood. ${pushed} produto(s) publicado(s).`);
          setPreviewVisible(false);
          return;
        }

        showError(formatIFoodApiError(response?.result || response));
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
    });
  }, [applyDetailResponse, providerId, selectedEligible, showError, showInfo, withAction]);

  const minimumRequiredItems = Number(productsResponse?.minimum_required_items || 1);

  const buildPreviewData = useCallback(() => {
    const categoriesMap = new Map();

    selectedEligible.forEach(product => {
      const categoryName = String(product?.category?.name || 'Sem categoria').trim();
      const currentCount = categoriesMap.get(categoryName) || 0;
      categoriesMap.set(categoryName, currentCount + 1);
    });

    const categories = Array.from(categoriesMap.entries()).map(([categoryName, count], index) => ({
      app_category_id: `${index + 1}`,
      category_name: categoryName,
      app_item_ids: Array.from({ length: count }).map((_, itemIndex) => `${categoryName}-${itemIndex + 1}`),
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
          showError(formatIFoodApiError(response?.result || response));
        }
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
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
          showError(formatIFoodApiError(response?.result || response));
        }
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
    });
  }, [applyDetailResponse, providerId, showError, showInfo, withAction]);

  const handleConnect = useCallback(async () => {
    if (!providerId) return;

    const merchantId = String(merchantIdInput || '').trim();
    if (!merchantId) {
      showInfo('Informe o código da loja iFood para conectar.');
      return;
    }

    await withAction('connect', async () => {
      try {
        const response = await api.fetch('/marketplace/integrations/ifood/store/connect', {
          method: 'POST',
          body: JSON.stringify({ provider_id: providerId, merchant_id: merchantId }),
        });
        applyDetailResponse(response);
        showInfo('Loja iFood conectada com sucesso.');
        loadProducts();
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
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
      } catch (error) {
        showError(formatIFoodApiError(error));
      }
    });
  }, [applyDetailResponse, providerId, showError, withAction]);

  const handleItemStatusToggle = useCallback(async product => {
    if (!providerId || !product?.ifood_item_id) return;

    const itemId = product.ifood_item_id;
    const nextStatus = product.ifood_status === 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
    setItemStatusLoading(current => new Set([...current, itemId]));

    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/item/status', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, item_id: itemId, status: nextStatus }),
      });

      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(current => {
          if (!current?.products) return current;
          return {
            ...current,
            products: current.products.map(item =>
              item.ifood_item_id === itemId ? { ...item, ifood_status: nextStatus } : item
            ),
          };
        });
        showInfo(`Item ${nextStatus === 'AVAILABLE' ? 'disponivel' : 'indisponivel'} no iFood.`);
      } else {
        showError(formatIFoodApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatIFoodApiError(error));
    } finally {
      setItemStatusLoading(current => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }, [providerId, showError, showInfo]);

  const handleItemPriceSave = useCallback(async product => {
    if (!providerId || !product?.ifood_item_id) return;

    const itemId = product.ifood_item_id;
    const raw = itemPriceEditing[itemId];
    const price = parseFloat(String(raw ?? '').replace(',', '.'));

    if (!Number.isFinite(price) || price <= 0) {
      showError('Informe um preco valido maior que zero.');
      return;
    }

    setItemPriceLoading(current => new Set([...current, itemId]));

    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/item/price', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, item_id: itemId, price }),
      });

      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(current => {
          if (!current?.products) return current;
          return {
            ...current,
            products: current.products.map(item =>
              item.ifood_item_id === itemId ? { ...item, price } : item
            ),
          };
        });
        setItemPriceEditing(current => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        showInfo('Preco atualizado no iFood.');
      } else {
        showError(formatIFoodApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatIFoodApiError(error));
    } finally {
      setItemPriceLoading(current => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }, [itemPriceEditing, providerId, showError, showInfo]);

  const startEditHours = useCallback(() => {
    const draft = DAY_ORDER.map(day => {
      const existing = (hours || []).find(item => item.dayOfWeek === day);
      const isOpen = !!existing && (existing.shifts || []).length > 0;
      const shifts = isOpen ? existing.shifts : [{ start: '09:00', duration: 840 }];
      return { dayOfWeek: day, open: isOpen, shifts };
    });

    setHoursDraft(draft);
    setHoursEditing(true);
  }, [hours]);

  const cancelEditHours = useCallback(() => {
    setHoursEditing(false);
    setHoursDraft(null);
  }, []);

  const updateHoursDraft = useCallback((dayOfWeek, shiftIndex, field, value) => {
    setHoursDraft(current => {
      if (!Array.isArray(current)) return current;

      return current.map(day => {
        if (day.dayOfWeek !== dayOfWeek) return day;
        if (field === 'open') return { ...day, open: value };

        const shifts = (day.shifts || []).map((shift, index) => {
          if (index !== shiftIndex) return shift;
          if (field === 'end') return { ...shift, duration: calcDuration(shift.start, value) };
          return { ...shift, [field]: value };
        });

        return { ...day, shifts };
      });
    });
  }, []);

  const saveHours = useCallback(async () => {
    if (!providerId || !hoursDraft) return;

    setHoursSaving(true);
    try {
      const flatShifts = (hoursDraft || [])
        .filter(day => day.open)
        .flatMap(day =>
          (day.shifts || []).map(shift => ({
            dayOfWeek: day.dayOfWeek,
            start: /^\d{2}:\d{2}$/.test(shift.start) ? `${shift.start}:00` : shift.start,
            duration: Number(shift.duration) || 840,
          }))
        );

      const response = await api.fetch('/marketplace/integrations/ifood/store/hours', {
        method: 'PUT',
        body: JSON.stringify({ provider_id: providerId, shifts: flatShifts }),
      });

      if (String(response?.result?.errno ?? response?.errno ?? '') === '0') {
        const grouped = flatShifts.reduce((accumulator, { dayOfWeek, start, duration }) => {
          let entry = accumulator.find(item => item.dayOfWeek === dayOfWeek);
          if (!entry) {
            entry = { dayOfWeek, shifts: [] };
            accumulator.push(entry);
          }
          entry.shifts.push({ start: String(start).substring(0, 5), duration });
          return accumulator;
        }, []);

        setHours(grouped);
        setHoursEditing(false);
        setHoursDraft(null);
        showInfo('Horarios de funcionamento atualizados no iFood.');
      } else {
        showError(formatIFoodApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatIFoodApiError(error));
    } finally {
      setHoursSaving(false);
    }
  }, [hoursDraft, providerId, showError, showInfo]);

  const handleOptionStatusToggle = useCallback(async (product, option) => {
    if (!providerId || !option?.ifood_option_id) return;

    const optionId = option.ifood_option_id;
    const nextStatus = option.ifood_status === 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
    setOptStatusLoading(current => new Set([...current, optionId]));

    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/option/status', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, option_id: optionId, status: nextStatus }),
      });

      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(current => {
          if (!current?.products) return current;
          return {
            ...current,
            products: current.products.map(item =>
              item.id === product.id
                ? {
                    ...item,
                    options: (item.options || []).map(currentOption =>
                      currentOption.ifood_option_id === optionId
                        ? { ...currentOption, ifood_status: nextStatus }
                        : currentOption
                    ),
                  }
                : item
            ),
          };
        });
        showInfo(`Complemento ${nextStatus === 'AVAILABLE' ? 'disponivel' : 'indisponivel'} no iFood.`);
      } else {
        showError(formatIFoodApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatIFoodApiError(error));
    } finally {
      setOptStatusLoading(current => {
        const next = new Set(current);
        next.delete(optionId);
        return next;
      });
    }
  }, [providerId, showError, showInfo]);

  const handleOptionPriceSave = useCallback(async (product, option) => {
    if (!providerId || !option?.ifood_option_id) return;

    const optionId = option.ifood_option_id;
    const raw = optPriceEditing[optionId];
    const price = parseFloat(String(raw ?? '').replace(',', '.'));

    if (!Number.isFinite(price) || price <= 0) {
      showError('Informe um preco valido maior que zero.');
      return;
    }

    setOptPriceLoading(current => new Set([...current, optionId]));

    try {
      const response = await api.fetch('/marketplace/integrations/ifood/menu/option/price', {
        method: 'PATCH',
        body: JSON.stringify({ provider_id: providerId, option_id: optionId, price }),
      });

      if (String(response?.result?.errno ?? '') === '0') {
        setProductsResponse(current => {
          if (!current?.products) return current;
          return {
            ...current,
            products: current.products.map(item =>
              item.id === product.id
                ? {
                    ...item,
                    options: (item.options || []).map(currentOption =>
                      currentOption.ifood_option_id === optionId
                        ? { ...currentOption, price }
                        : currentOption
                    ),
                  }
                : item
            ),
          };
        });
        setOptPriceEditing(current => {
          const next = { ...current };
          delete next[optionId];
          return next;
        });
        showInfo('Preco do complemento atualizado no iFood.');
      } else {
        showError(formatIFoodApiError(response?.result || response));
      }
    } catch (error) {
      showError(formatIFoodApiError(error));
    } finally {
      setOptPriceLoading(current => {
        const next = new Set(current);
        next.delete(optionId);
        return next;
      });
    }
  }, [optPriceEditing, providerId, showError, showInfo]);

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

  const integration = detail?.integration || {};
  const stores = Array.isArray(detail?.stores?.items) ? detail.stores.items : [];
  const ifoodCode = String(integration?.ifood_code || integration?.merchant_id || '');
  const selectedStore =
    detail?.selected_store ||
    stores.find(store => String(store?.merchant_id || '') === ifoodCode);
  const selectedStoreDetail = detail?.selected_store_detail || null;
  const connected = Boolean(integration?.connected);
  const authAvailable = Boolean(integration?.auth_available);
  const remoteConnected = Boolean(integration?.remote_connected);
  const statusTone = connected ? '#16A34A' : '#F59E0B';
  const statusText = connected ? 'Conectada' : 'Pendente';
  const logo = getOrderChannelLogo({ app: 'iFood' });
  const eligibleCount = productsResponse?.eligible_product_count || 0;
  const activeInterruptions = Array.isArray(storeStatus?.data?.interruptions) ? storeStatus.data.interruptions : [];

  const tabCounts = {
    all: products.length,
    eligible: products.filter(product => product.eligible).length,
    selected: selectedIds.size,
    blocked: products.filter(product => !product.eligible).length,
  };

  const sectionTabs = [
    { key: 'overview', label: 'Resumo' },
    { key: 'store', label: 'Loja', badge: stores.length },
    { key: 'operations', label: 'Operacao' },
    { key: 'catalog', label: 'Cardapio', badge: selectedEligible.length },
  ];

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
          title="Integracao iFood"
          description="Gerencie vinculacao da loja, operacao diaria e publicacao do cardapio em blocos menores."
          logo={logo}
          iconName="shopping-bag"
        />

        <IntegrationTabs
          tabs={sectionTabs}
          activeKey={activeTab}
          onChange={setActiveTab}
          accentColor={brandColors.primary}
        />

        {activeTab === 'overview' && (
          <IFoodOverviewTab
            shadowStyle={integrationCardShadowStyle}
            integration={integration}
            connected={connected}
            remoteConnected={remoteConnected}
            authAvailable={authAvailable}
            statusTone={statusTone}
            statusText={statusText}
            eligibleCount={eligibleCount}
            selectedStoreDetail={selectedStoreDetail}
          />
        )}

        {activeTab === 'store' && (
          <IFoodStoreTab
            shadowStyle={integrationCardShadowStyle}
            accentColor={brandColors.primary}
            stores={stores}
            merchantIdInput={merchantIdInput}
            setMerchantIdInput={setMerchantIdInput}
            ifoodCode={ifoodCode}
            selectedStore={selectedStore}
            connected={connected}
            actionLoading={actionLoading}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
          />
        )}

        {activeTab === 'operations' && (
          <IFoodOperationsTab
            shadowStyle={integrationCardShadowStyle}
            connected={connected}
            storeStatus={storeStatus}
            activeInterruptions={activeInterruptions}
            actionLoading={actionLoading}
            onStoreOpen={handleStoreOpen}
            onStoreClose={handleStoreClose}
            onRefreshStatus={loadStoreStatus}
            hours={hours}
            hoursLoading={hoursLoading}
            hoursEditing={hoursEditing}
            onStartEditHours={startEditHours}
            hoursDraft={hoursDraft}
            onUpdateHoursDraft={updateHoursDraft}
            hoursSaving={hoursSaving}
            onSaveHours={saveHours}
            onCancelEditHours={cancelEditHours}
          />
        )}

        {activeTab === 'catalog' && (
          <IFoodCatalogTab
            shadowStyle={integrationCardShadowStyle}
            accentColor={brandColors.primary}
            connected={connected}
            minimumRequiredItems={minimumRequiredItems}
            eligibleCount={eligibleCount}
            search={search}
            setSearch={setSearch}
            filterKey={filterKey}
            setFilterKey={setFilterKey}
            tabCounts={tabCounts}
            selectedEligible={selectedEligible}
            onOpenPreview={handleOpenPreview}
            actionLoading={actionLoading}
            filteredProducts={filteredProducts}
            selectedIds={selectedIds}
            onProductCardPress={handleProductCardPress}
            onMarkCardPressHandled={markNextProductCardPressAsHandled}
            onBlockCardPress={blockNextProductCardPress}
            onToggleItemStatus={handleItemStatusToggle}
            onSaveItemPrice={handleItemPriceSave}
            itemStatusLoading={itemStatusLoading}
            itemPriceLoading={itemPriceLoading}
            itemPriceEditing={itemPriceEditing}
            setItemPriceEditing={setItemPriceEditing}
            optStatusLoading={optStatusLoading}
            optPriceLoading={optPriceLoading}
            optPriceEditing={optPriceEditing}
            setOptPriceEditing={setOptPriceEditing}
            onSaveOptionPrice={handleOptionPriceSave}
            onToggleOptionStatus={handleOptionStatusToggle}
            onSyncCatalog={handleCatalogSync}
          />
        )}
      </ScrollView>

      <IFoodPreviewModal
        visible={previewVisible}
        previewData={previewData}
        selectedEligible={selectedEligible}
        accentColor={brandColors.primary}
        uploading={actionLoading === 'menu_upload'}
        onClose={() => setPreviewVisible(false)}
        onUpload={() => handleMenuUpload(selectedEligible)}
      />
    </SafeAreaView>
  );
}

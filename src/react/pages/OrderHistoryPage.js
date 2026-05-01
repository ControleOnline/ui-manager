import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { env } from '@env';
import { useStore } from '@store';
import CompactFilterSelector from '@controleonline/ui-common/src/react/components/filters/CompactFilterSelector';
import DateShortcutFilter from '@controleonline/ui-common/src/react/components/filters/DateShortcutFilter';
import {
  canDeviceViewCompanyOrders,
  isPosCounterMode,
  isPosCashRegisterClosed,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import { getDateRange } from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { buildOrderDetailsRouteParams } from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { resolveOrderIdentity } from '@controleonline/ui-orders/src/react/utils/orderIdentity';
import usePosCartSession from '@controleonline/ui-orders/src/react/hooks/usePosCartSession';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import styles from './OrderHistoryPage.styles';

/* ─── constantes ────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

/* tabs sem filtro de canal/status */
const ORDER_TYPE_FILTER_KEYS = new Set(['sale', 'purchase', 'transfer', 'loss']);
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);

/* ─── helpers ───────────────────────────────────────────────────────── */

const normalizeText = value => String(value || '').trim();

const stripLeadingPrefixes = (value, prefixes = []) => {
  const label = normalizeText(value);
  if (!label) return '';

  const matchedPrefix = prefixes.find(prefix =>
    label.toLowerCase().startsWith(String(prefix || '').toLowerCase()),
  );

  return matchedPrefix ? label.slice(String(matchedPrefix).length).trim() : label;
};

const looksLikeTranslationKey = value =>
  /^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(normalizeText(value));

const resolveDisplayText = (value, fallback = '', prefixes = []) => {
  const label = stripLeadingPrefixes(value, prefixes);

  if (!label || looksLikeTranslationKey(label)) {
    return fallback;
  }

  return label;
};

const resolveOrderTypeFilter = value => {
  const normalizedValue = normalizeText(value).toLowerCase();
  return ORDER_TYPE_FILTER_KEYS.has(normalizedValue) ? normalizedValue : 'sale';
};

const getEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id) return Number(entity.id);
    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const getPeopleLabel = entity =>
  normalizeText(
    entity?.alias ||
    entity?.name ||
    entity?.fantasy_name ||
    entity?.company ||
    entity?.document
  );

const getSearchText = o => {
  const identity = resolveOrderIdentity(o);

  return [
    o?.id,
    o?.app,
    identity?.internalId,
    identity?.externalId,
    identity?.primaryText,
    identity?.secondaryText,
    o?.client?.name,
    o?.client?.alias,
    o?.status?.status,
    o?.status?.realStatus,
  ].filter(Boolean).join(' ').toLowerCase();
};

/* ─── componente principal ──────────────────────────────────────────── */

export default function OrderHistoryPage({ navigation, route }) {
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const deviceConfigStore = useStore('device_config');
  const isFocused = useIsFocused();
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const { item: storagedDevice } = deviceGetters;
  const { item: deviceConfig } = deviceConfigStore.getters;
  const { actions: peopleActions, getters: peopleGetters } = peopleStore;
  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeStore.getters;
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const {
    items: storedOrders,
    totalItems: storedTotalItems,
    isLoadingList,
    loadedKey,
  } = ordersGetters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const channelOptions = useMemo(() => ([
    {
      key: 'all',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'All',
    },
    {
      key: 'Food99',
      label: resolveDisplayText(global.t?.t('orders', 'label', 'channel_food99'), '99Food', ['Channel ']),
    },
    {
      key: 'iFood',
      label: resolveDisplayText(global.t?.t('orders', 'label', 'channel_ifood'), 'iFood', ['Channel ']),
    },
    {
      key: 'SHOP',
      label: resolveDisplayText(global.t?.t('orders', 'label', 'channel_shop'), 'Shop', ['Channel ']),
    },
    {
      key: 'POS',
      label: resolveDisplayText(global.t?.t('orders', 'label', 'channel_pos'), 'POS', ['Channel ']),
    },
  ]), []);

  const statusOptions = useMemo(() => ([
    {
      key: 'all',
      label: normalizeText(global.t?.t('orders', 'label', 'all')) || 'All',
    },
    {
      key: 'open',
      label: normalizeText(global.t?.t('orders', 'status', 'open')) || 'Open',
    },
    {
      key: 'pending',
      label: normalizeText(global.t?.t('orders', 'status', 'pending')) || 'Pending',
    },
    {
      key: 'closed',
      label: normalizeText(global.t?.t('orders', 'status', 'closed')) || 'Closed',
    },
    {
      key: 'canceled',
      label: normalizeText(global.t?.t('orders', 'status', 'canceled')) || 'Canceled',
    },
  ]), []);

  /* ─── estado ──────────────────────────────────────────────────────── */

  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [orderTypeFilter, setOrderTypeFilter] = useState(
    () => resolveOrderTypeFilter(route?.params?.orderTypeFilter),
  );
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [searchText, setSearchText] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [purchaseSuppliersById, setPurchaseSuppliersById] = useState({});

  const isCashRegisterClosed = useMemo(() => {
    return isPosCashRegisterClosed(deviceConfig?.configs);
  }, [deviceConfig?.configs]);
  const isCounterMode = useMemo(() => {
    return isPosCounterMode(deviceConfig?.configs);
  }, [deviceConfig?.configs]);
  const { resolveCounterStartDestination } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: defaultCompany?.configs?.['pos-default-status'],
  });

  const canViewCompanyOrders = useMemo(
    () => canDeviceViewCompanyOrders(deviceConfig?.configs),
    [deviceConfig?.configs],
  );

  const showAdvancedFilters = env.APP_TYPE !== 'POS' || canViewCompanyOrders;
  const orders = useMemo(
    () => (Array.isArray(storedOrders) ? storedOrders : []),
    [storedOrders],
  );
  const totalOrders = Number(storedTotalItems || 0);
  const routeOrderTypeFilter = useMemo(
    () => resolveOrderTypeFilter(route?.params?.orderTypeFilter),
    [route?.params?.orderTypeFilter],
  );
  const defaultHistoryTitle = useMemo(
    () => normalizeText(global.t?.t('configs', 'title', 'orderHistory')) || 'Historico de pedidos',
    [],
  );
  const historyPageTitle = useMemo(
    () => normalizeText(route?.params?.historyTitle) || defaultHistoryTitle,
    [defaultHistoryTitle, route?.params?.historyTitle],
  );
  const currentChannelLabel = useMemo(
    () => channelOptions.find(option => option.key === channelFilter)?.label || channelOptions[0]?.label || 'All',
    [channelFilter, channelOptions],
  );
  const currentStatusLabel = useMemo(
    () => statusOptions.find(option => option.key === statusFilter)?.label || statusOptions[0]?.label || 'All',
    [statusFilter, statusOptions],
  );

  /* ref para evitar fetch duplicado */
  const fetchingRef = useRef(false);
  const loadingPurchaseSuppliersRef = useRef(new Set());

  const goToAddProduct = useCallback(() => {
    if (orderTypeFilter === 'purchase') {
      navigation.navigate('PurchaseFormPage');
      return;
    }

    if (orderTypeFilter === 'transfer') {
      navigation.navigate('PurchaseFormPage', { mode: 'transfer' });
      return;
    }

    if (orderTypeFilter === 'loss') {
      return;
    }

    if (env.APP_TYPE === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate('PdvPage', {startNewOrder: true});
  }, [navigation, isCashRegisterClosed, orderTypeFilter]);

  useEffect(() => {
    navigation.setOptions?.({ title: historyPageTitle });
  }, [historyPageTitle, navigation]);

  useEffect(() => {
    setOrderTypeFilter(routeOrderTypeFilter);
    setChannelFilter('all');
    setStatusFilter('all');
    setSearchText('');
  }, [routeOrderTypeFilter]);

  useEffect(() => {
    if (!isFocused || env.APP_TYPE !== 'POS' || !isCounterMode) {
      return;
    }

    if (route?.params?.resumeCounterFlow !== true) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const destination = await resolveCounterStartDestination();

        if (cancelled) {
          return;
        }

        if (destination.screen === 'OrderHistoryPage') {
          navigation.setParams?.({resumeCounterFlow: false});
          return;
        }

        if (destination.screen === 'OrderDetails' && destination.order) {
          navigation.replace(
            'OrderDetails',
            buildOrderDetailsRouteParams(destination.order),
          );
          return;
        }

        navigation.replace('AddProductScreen');
      } catch {
        if (!cancelled) {
          navigation.replace('AddProductScreen');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isCounterMode,
    isFocused,
    navigation,
    resolveCounterStartDestination,
    route?.params?.resumeCounterFlow,
  ]);

  useEffect(() => {
    if (!isFocused || env.APP_TYPE !== 'POS') return;
    if (!isCashRegisterClosed) return;

    navigation.navigate('CloseCashRegister');
  }, [isFocused, isCashRegisterClosed, navigation]);

  const historyQuery = useMemo(() => {
    if (!currentCompany?.id) return null;

    const query = {
      provider: `/people/${currentCompany.id}`,
      itemsPerPage: PAGE_SIZE,
      'order[id]': 'desc',
    };

    if (orderTypeFilter !== 'all') query.orderType = orderTypeFilter;
    if (showAdvancedFilters && channelFilter !== 'all') query.app = channelFilter;
    if (showAdvancedFilters && statusFilter !== 'all') query['status.realStatus'] = statusFilter;

    if (env.APP_TYPE === 'POS' && !canViewCompanyOrders && storagedDevice?.id) {
      query['device.device'] = storagedDevice.id;
    }

    const dateRange = showAdvancedFilters
      ? getDateRange(dateFilter, customRange, {
        relativeMode: 'rolling',
        useCurrentMoment: true,
      })
      : {};
    if (dateRange?.after) query['alterDate[after]'] = dateRange.after;
    if (dateRange?.before) query['alterDate[before]'] = dateRange.before;

    return query;
  }, [
    currentCompany?.id,
    orderTypeFilter,
    showAdvancedFilters,
    channelFilter,
    statusFilter,
    canViewCompanyOrders,
    storagedDevice?.id,
    dateFilter,
    customRange,
  ]);

  const historyLoadedKey = useMemo(
    () => JSON.stringify(historyQuery || {}),
    [historyQuery],
  );
  const hasMore = useMemo(() => {
    if (!orders.length) return false;
    if (totalOrders > 0) return orders.length < totalOrders;
    return orders.length % PAGE_SIZE === 0;
  }, [orders.length, totalOrders]);

  /* ─── fetch (aceita página, acumula ou substitui) ────────────────── */

  const fetchPage = useCallback(async (targetPage, replace = false) => {
    if (!historyQuery) {
      orderActions.setItems([]);
      orderActions.setTotalItems(0);
      setError('');
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setError('');
      await orderActions.fetchHistoryPage({
        query: {
          ...historyQuery,
          page: targetPage,
        },
        append: !replace,
        loadedKey: historyLoadedKey,
      });
    } catch (err) {
      setError(
        err?.message ||
        global.t?.t('orders', 'state', 'Não foi possível carregar o histórico.'),
      );
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [
    orderActions,
    historyLoadedKey,
    historyQuery,
  ]);

  /* carrega somente quando o snapshot atual da store não atende ao filtro atual */
  useEffect(() => {
    if (!isFocused) return;

    if (!currentCompany?.id) {
      const shouldClearHistorySnapshot =
        (Array.isArray(storedOrders) && storedOrders.length > 0) ||
        Number(storedTotalItems || 0) > 0;

      if (shouldClearHistorySnapshot) {
        orderActions.setItems([]);
        orderActions.setTotalItems(0);
      }

      if (error) {
        setError('');
      }

      return;
    }

    const hasLoadedSnapshot =
      loadedKey === historyLoadedKey &&
      Array.isArray(storedOrders);

    if (!hasLoadedSnapshot) {
      fetchPage(1, true);
      return;
    }

    setError('');
  }, [
    isFocused,
    currentCompany?.id,
    fetchPage,
    historyLoadedKey,
    loadedKey,
    orderActions,
    error,
    storedOrders,
    storedTotalItems,
  ]);

  /* pull-to-refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, true);
  }, [fetchPage]);

  /* scroll infinito — carrega próxima página */
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || fetchingRef.current) return;
    setLoadingMore(true);
    fetchPage(Math.floor(orders.length / PAGE_SIZE) + 1, false);
  }, [loadingMore, hasMore, fetchPage, orders.length]);

  const handleScroll = useCallback(({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 60) loadMore();
  }, [loadMore]);

  /* ─── filtros client-side (canal, status, busca) ─────────────────── */

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.trim().toLowerCase().replace(/^#/, '');
    return orders.filter(o => getSearchText(o).includes(q));
  }, [orders, searchText]);
  const displayedOrdersCount = useMemo(() => {
    if (searchText.trim()) {
      return filteredOrders.length;
    }

    return totalOrders || filteredOrders.length;
  }, [filteredOrders.length, searchText, totalOrders]);

  useEffect(() => {
    const missingSupplierIds = [...new Set(
      orders
        .filter(order => order?.orderType === 'purchase')
        .map(order => {
          const supplierId = getEntityId(order?.client);
          const supplierLabel = getPeopleLabel(order?.client);
          const alreadyResolved = supplierId
            ? Object.prototype.hasOwnProperty.call(purchaseSuppliersById, supplierId)
            : false;

          if (!supplierId || supplierLabel || alreadyResolved || loadingPurchaseSuppliersRef.current.has(supplierId)) {
            return null;
          }

          return supplierId;
        })
        .filter(Boolean)
    )];

    if (!missingSupplierIds.length) return undefined;

    missingSupplierIds.forEach(id => loadingPurchaseSuppliersRef.current.add(id));

    let cancelled = false;

    (async () => {
      const resolvedSuppliers = await Promise.all(
        missingSupplierIds.map(async id => {
          try {
            const supplier = await peopleActions.get(id);
            return [id, getPeopleLabel(supplier)];
          } catch {
            return [id, ''];
          } finally {
            loadingPurchaseSuppliersRef.current.delete(id);
          }
        }),
      );

      if (cancelled) return;

      setPurchaseSuppliersById(prev => {
        let changed = false;
        const next = { ...prev };

        resolvedSuppliers.forEach(([id, label]) => {
          if (next[id] !== label) {
            next[id] = label;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [orders, peopleActions, purchaseSuppliersById]);

  const openOrder = useCallback(order => {
    orderActions.syncOrder?.(order);
    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order));
  }, [navigation, orderActions]);

  /* ─── card de pedido ─────────────────────────────────────────────── */

  const renderCard = useCallback(order => {
    const isPurchase = order.orderType === 'purchase';
    const isTransfer = order.orderType === 'transfer';
    const isLoss = order.orderType === 'loss';
    const purchaseSupplierId = getEntityId(order?.client);
    const purchaseSupplierLabel =
      getPeopleLabel(order?.client) ||
      (purchaseSupplierId ? purchaseSuppliersById[purchaseSupplierId] : '');

    const channelLabel = isPurchase
      ? (purchaseSupplierLabel || global.t?.t('orders', 'label', 'supplier'))
      : isTransfer
        ? global.t?.t('orders', 'label', 'stock_transfer')
        : isLoss
          ? global.t?.t('orders', 'label', 'stock_loss')
          : '';
    const showChannelLabel = isPurchase || isTransfer || isLoss;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => openOrder(order)}
      >
        <OrderHeader order={order} isKds={false} />

        {showChannelLabel && (
          <View style={styles.cardMetaRow}>
            <Text style={styles.channelText} numberOfLines={1}>{channelLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [openOrder, purchaseSuppliersById]);

  /* ─── render ─────────────────────────────────────────────────────── */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {/* filtros */}
        <View style={styles.filtersCard}>
          <View style={styles.filtersHeaderRow}>
            <Text style={styles.filtersTitle}>{global.t?.t('orders', 'title', 'filters')}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{displayedOrdersCount} {global.t?.t('orders', 'label', 'orders')}</Text>
            </View>
          </View>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={
              orderTypeFilter === 'purchase' ? global.t?.t('orders', 'placeholder', 'search_purchase')
                : orderTypeFilter === 'transfer' ? global.t?.t('orders', 'placeholder', 'search_transfer')
                  : orderTypeFilter === 'loss' ? global.t?.t('orders', 'placeholder', 'search_loss')
                    : global.t?.t('orders', 'placeholder', 'search_default')
            }
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          {showAdvancedFilters && (
            <View style={styles.filterSelectorsRow}>
              {orderTypeFilter === 'sale' && (
                <CompactFilterSelector
                  icon="radio"
                  label={currentChannelLabel}
                  labelCaption={global.t?.t('orders', 'label', 'channel') || 'Canal'}
                  accentColor={brandColors.primary}
                  active={channelFilter !== 'all'}
                  dense
                  title={global.t?.t('orders', 'label', 'channel')}
                  options={channelOptions}
                  selectedKey={channelFilter}
                  onSelect={optionKey => {
                    setChannelFilter(optionKey);
                    return true;
                  }}
                />
              )}

              {!SIMPLE_TAB_KEYS.has(orderTypeFilter) && (
                <CompactFilterSelector
                  icon="check-circle"
                  label={currentStatusLabel}
                  labelCaption={global.t?.t('orders', 'label', 'status') || 'Status'}
                  accentColor={brandColors.primary}
                  active={statusFilter !== 'all'}
                  dense
                  title={global.t?.t('orders', 'label', 'status')}
                  options={statusOptions}
                  selectedKey={statusFilter}
                  onSelect={optionKey => {
                    setStatusFilter(optionKey);
                    return true;
                  }}
                />
              )}

              <DateShortcutFilter
                value={dateFilter}
                onChange={setDateFilter}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                dense
                labelCaption={global.t?.t('orders', 'label', 'period') || 'Periodo'}
                colors={{
                  accent: brandColors.primary,
                  appBg: 'transparent',
                  border: '#CBD5E1',
                  borderSoft: '#E2E8F0',
                  cardBg: '#FFFFFF',
                  cardBgSoft: '#F8FAFC',
                  danger: '#DC2626',
                  isLight: true,
                  panelBg: '#EFF6FF',
                  pillTextDark: '#FFFFFF',
                  textPrimary: '#0F172A',
                  textSecondary: '#64748B',
                }}
                optionKeys={['all', 'today', 'yesterday', '7d', '30d', 'custom']}
              />
            </View>
          )}
        </View>

        {/* loading inicial */}
        {isLoadingList && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'loading_orders')}</Text>
          </View>
        )}

        {/* erro */}
        {!isLoadingList && !!error && (
          <View style={styles.centerState}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'load_error')}</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        )}

        {/* vazio */}
        {!isLoadingList && !error && filteredOrders.length === 0 && (
          <View style={styles.centerState}>
            <Icon name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'empty')}</Text>
            <Text style={styles.centerStateText}>{global.t?.t('orders', 'state', 'adjust_filters')}</Text>
          </View>
        )}

        {/* lista */}
        {!isLoadingList && !error && (
          <View style={styles.list}>
            {filteredOrders.map(order => renderCard(order))}
          </View>
        )}

        {/* loading mais */}
        {loadingMore && (
          <View style={styles.loadingMoreWrap}>
            <ActivityIndicator size="small" color={brandColors.primary} />
          </View>
        )}

        {/* fim da lista */}
        {!isLoadingList && !hasMore && filteredOrders.length > 0 && (
          <Text style={styles.endText}>{global.t?.t('orders', 'state', 'all_loaded')}</Text>
        )}

      </ScrollView>
      {orderTypeFilter !== 'loss' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.85}
          onPress={goToAddProduct}
        >
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

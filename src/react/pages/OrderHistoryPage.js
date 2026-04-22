import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import DateShortcutFilter from '@controleonline/ui-common/src/react/components/filters/DateShortcutFilter';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { getOrderChannelLabel, getOrderChannelLogo } from '@assets/ppc/channels';
import { canDeviceViewCompanyOrders } from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import { getDateRange } from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import { resolveDisplayedOrderStatus } from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { buildOrderDetailsRouteParams } from '@controleonline/ui-orders/src/react/utils/orderRoute';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import styles from './OrderHistoryPage.styles';

/* ─── constantes ────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

/* tabs sem filtro de canal/status */
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);

/* ─── helpers ───────────────────────────────────────────────────────── */

const normalizeText = value => String(value || '').trim();

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

const normalizeApp = o => normalizeText(o?.app);
const getSearchText = o =>
  [
    o?.id,
    o?.app,
    o?.client?.name,
    o?.client?.alias,
    o?.status?.status,
    o?.status?.realStatus,
  ].filter(Boolean).join(' ').toLowerCase();

const FilterChip = ({ active, label, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    activeOpacity={0.9}
    onPress={onPress}
  >
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

/* ─── componente principal ──────────────────────────────────────────── */

export default function OrderHistoryPage({ navigation }) {
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
  const { currentCompany } = peopleGetters;
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

  const dateShortcutColors = useMemo(() => ({
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
  }), [brandColors.primary]);

  const channelOptions = useMemo(() => ([
    { key: 'all', label: global.t?.t('orders', 'label', 'all') },
    { key: 'Food99', label: global.t?.t('orders', 'label', 'channel_food99') },
    { key: 'iFood', label: global.t?.t('orders', 'label', 'channel_ifood') },
    { key: 'SHOP', label: global.t?.t('orders', 'label', 'channel_shop') },
    { key: 'POS', label: global.t?.t('orders', 'label', 'channel_pos') },
  ]), []);

  const statusOptions = useMemo(() => ([
    { key: 'all', label: global.t?.t('orders', 'label', 'all') },
    { key: 'open', label: global.t?.t('orders', 'status', 'open') },
    { key: 'pending', label: global.t?.t('orders', 'status', 'pending') },
    { key: 'closed', label: global.t?.t('orders', 'status', 'closed') },
    { key: 'canceled', label: global.t?.t('orders', 'status', 'canceled') },
  ]), []);

  const tabs = useMemo(() => ([
    { key: 'sale', label: global.t?.t('orders', 'label', 'tab_sale'), icon: 'shopping-bag' },
    { key: 'purchase', label: global.t?.t('orders', 'label', 'tab_purchase'), icon: 'truck' },
    { key: 'transfer', label: global.t?.t('orders', 'label', 'tab_transfer'), icon: 'repeat' },
    { key: 'loss', label: global.t?.t('orders', 'label', 'tab_loss'), icon: 'trending-down' },
  ]), []);

  /* ─── estado ──────────────────────────────────────────────────────── */

  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [orderTypeFilter, setOrderTypeFilter] = useState('sale');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [purchaseSuppliersById, setPurchaseSuppliersById] = useState({});

  const isCashRegisterClosed = useMemo(() => {
    const closedId = Number(deviceConfig?.configs?.['cash-wallet-closed-id']);
    return (
      !deviceConfig?.configs ||
      deviceConfig?.configs?.['cash-wallet-closed-id'] === undefined ||
      (Number.isFinite(closedId) && closedId > 0)
    );
  }, [deviceConfig?.configs]);

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

  /* ref para evitar fetch duplicado */
  const fetchingRef = useRef(false);
  const loadingPurchaseSuppliersRef = useRef(new Set());

  const goToAddProduct = useCallback(() => {
    if (env.APP_TYPE === 'POS' && isCashRegisterClosed) {
      navigation.navigate('CloseCashRegister');
      return;
    }

    navigation.navigate('PdvPage');
  }, [navigation, isCashRegisterClosed]);

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
    navigation.navigate('OrderDetails', buildOrderDetailsRouteParams(order, { kds: true }));
  }, [navigation, orderActions]);

  /* ─── card de pedido ─────────────────────────────────────────────── */

  const renderCard = useCallback(order => {
    const isPurchase = order.orderType === 'purchase';
    const isTransfer = order.orderType === 'transfer';
    const isLoss = order.orderType === 'loss';
    const channelLogo = (isPurchase || isTransfer || isLoss) ? null : getOrderChannelLogo(order);
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
          : (getOrderChannelLabel(order) || normalizeApp(order) || global.t?.t('orders', 'label', 'shop'));

    const statusPresentation = resolveDisplayedOrderStatus(order, '#64748B');
    const statusLabel = statusPresentation.labelUpper;
    const statusColor = statusPresentation.color;
    const price = Number(order?.price || 0);

    const iconName =
      isPurchase ? 'truck'
        : isTransfer ? 'repeat'
          : isLoss ? 'trending-down'
            : 'shopping-bag';

    const iconColor =
      isPurchase ? '#D97706'
        : isTransfer ? '#7C3AED'
          : isLoss ? '#DC2626'
            : '#64748B';

    const iconWrapStyle =
      isPurchase ? styles.orderIconWrapPurchase
        : isTransfer ? styles.orderIconWrapTransfer
          : isLoss ? styles.orderIconWrapLoss
            : null;

    const priceStyle =
      isPurchase ? styles.purchasePriceText
        : isTransfer ? styles.transferPriceText
          : isLoss ? styles.lossPriceText
            : null;



    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => openOrder(order)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.orderIdentity}>
            <View style={[styles.orderIconWrap, iconWrapStyle]}>
              {channelLogo
                ? <Image source={channelLogo} style={styles.channelLogo} resizeMode="contain" />
                : <Icon name={iconName} size={16} color={iconColor} />
              }
            </View>
            <View>
              <Text style={styles.orderId}>{global.t?.t('orders', 'label', 'order')} #{order.id}</Text>
              <Text style={styles.orderDate}>
                {Formatter.formatDateYmdTodmY(
                  order?.alterDate || order?.alter_date || order?.orderDate || order?.order_date,
                  true,
                )}
              </Text>
            </View>
          </View>

          {!isTransfer && !isLoss && (
            <View style={[
              styles.statusBadge,
              { borderColor: withOpacity(statusColor, 0.4), backgroundColor: withOpacity(statusColor, 0.08) },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardMetaRow}>
          <Text style={styles.channelText} numberOfLines={1}>{channelLabel}</Text>
          {price > 0 && (
            <Text style={[styles.priceText, priceStyle]}>
              {Formatter.formatMoney(price)}
            </Text>
          )}
        </View>
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
        {/* cabeçalho */}
        <View style={[styles.heroCard, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{global.t?.t('orders', 'title', 'orders')}</Text>
            <Text style={styles.heroTitle}>{global.t?.t('orders', 'title', 'history')}</Text>
            <Text style={styles.heroText}>
              {orderTypeFilter === 'purchase' ? global.t?.t('orders', 'description', 'purchase_period')
                : orderTypeFilter === 'transfer' ? global.t?.t('orders', 'description', 'transfer_period')
                  : orderTypeFilter === 'loss' ? global.t?.t('orders', 'description', 'loss_period')
                    : global.t?.t('orders', 'description', 'filter_channel_status_period')}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon
              name={
                orderTypeFilter === 'purchase' ? 'truck'
                  : orderTypeFilter === 'transfer' ? 'repeat'
                    : orderTypeFilter === 'loss' ? 'trending-down'
                      : 'shopping-bag'
              }
              size={22}
              color={brandColors.primary}
            />
          </View>
        </View>

        {/* tabs Vendas | Compras | Transferências | Perdas */}
        {env.APP_TYPE !== 'POS' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
            {tabs.map(tab => {
              const active = orderTypeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, active && [styles.tabItemActive, { borderBottomColor: brandColors.primary }]]}
                  onPress={() => { setOrderTypeFilter(tab.key); setChannelFilter('all'); setStatusFilter('all'); }}
                  activeOpacity={0.8}
                >
                  <Icon name={tab.icon} size={14} color={active ? brandColors.primary : '#94A3B8'} />
                  <Text style={[styles.tabLabel, active && [styles.tabLabelActive, { color: brandColors.primary }]]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* empresa + contagem */}
        <View style={styles.summaryRow}>
          <Text style={styles.sectionTitle}>{currentCompany?.name || currentCompany?.alias || global.t?.t('orders', 'label', 'company')}</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredOrders.length}{hasMore ? '+' : ''} {global.t?.t('orders', 'label', 'orders')}</Text>
          </View>
        </View>

        {/* filtros */}
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>{global.t?.t('orders', 'title', 'filters')}</Text>

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

          {showAdvancedFilters && orderTypeFilter === 'sale' && (
            <>
              <Text style={styles.filterLabel}>{global.t?.t('orders', 'label', 'channel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {channelOptions.map(opt => (
                  <FilterChip key={`ch-${opt.key}`} active={channelFilter === opt.key} label={opt.label} onPress={() => setChannelFilter(opt.key)} />
                ))}
              </ScrollView>
            </>
          )}

          {showAdvancedFilters && !SIMPLE_TAB_KEYS.has(orderTypeFilter) && (
            <>
              <Text style={styles.filterLabel}>{global.t?.t('orders', 'label', 'status')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {statusOptions.map(opt => (
                  <FilterChip key={`st-${opt.key}`} active={statusFilter === opt.key} label={opt.label} onPress={() => setStatusFilter(opt.key)} />
                ))}
              </ScrollView>
            </>
          )}
          {showAdvancedFilters && (
            <View style={styles.dateShortcutWrap}>
              <DateShortcutFilter
                value={dateFilter}
                onChange={setDateFilter}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                colors={dateShortcutColors}
                optionKeys={['all', 'today', '7d', '30d', 'custom']}
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
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: brandColors.primary }]}
        activeOpacity={0.85}
        onPress={goToAddProduct}
      >
        <Icon name="plus" size={22} color="#fff" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

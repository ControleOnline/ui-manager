import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { getOrderChannelLabel, getOrderChannelLogo } from '@assets/ppc/channels';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';

/* ─── constantes ────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/* tabs sem filtro de canal/status */
const SIMPLE_TAB_KEYS = new Set(['transfer', 'loss']);

/* ─── helpers ───────────────────────────────────────────────────────── */

const pad2 = v => String(v).padStart(2, '0');

const formatDateToApi = d =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const parseDateInput = value => {
  const s = String(value || '').trim();
  if (!DATE_INPUT_PATTERN.test(s)) return null;
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(y, m - 1, day, 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
};

const getDateRange = (dateFilter, customRange) => {
  const now = new Date();
  if (dateFilter === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }
  if (dateFilter === '7d') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }
  if (dateFilter === '30d') {
    const start = new Date(now); start.setDate(now.getDate() - 30);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }
  if (dateFilter === 'custom') {
    const from = parseDateInput(customRange?.from);
    const to = parseDateInput(customRange?.to);
    if (!from && !to) return {};
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);
    return { after: from ? formatDateToApi(from) : null, before: to ? formatDateToApi(to) : null };
  }
  return {};
};

const normalizeApp = o => String(o?.app || '').trim();
const getStatusColor = o => o?.status?.color || '#64748B';
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
  const isFocused = useIsFocused();

  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { actions: orderActions, getters: ordersGetters } = ordersStore;
  const { isLoading: storeLoading } = ordersGetters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const dateFilterOptions = useMemo(() => ([
    { key: 'all', label: global.t?.t('orders', 'label', 'period_all') },
    { key: 'today', label: global.t?.t('orders', 'label', 'period_today') },
    { key: '7d', label: global.t?.t('orders', 'label', 'period_7d') },
    { key: '30d', label: global.t?.t('orders', 'label', 'period_30d') },
    { key: 'custom', label: global.t?.t('orders', 'label', 'period_custom') },
  ]), []);

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

  const getStatusLabel = useCallback((order) => {
    const rs = String(order?.status?.realStatus || '').toLowerCase();
    const s = String(order?.status?.status || '').toLowerCase();
    const statusKey = rs || s;

    if (statusKey === 'open') return global.t?.t('orders', 'status', 'open');
    if (statusKey === 'pending') return global.t?.t('orders', 'status', 'pending');
    if (statusKey === 'closed') return global.t?.t('orders', 'status', 'closed');
    if (statusKey === 'canceled') return global.t?.t('orders', 'status', 'canceled');
    if (statusKey === 'paid') return global.t?.t('orders', 'status', 'paid');
    if (statusKey === 'waiting payment') return global.t?.t('orders', 'status', 'waiting_payment');
    if (statusKey === 'quote') return global.t?.t('orders', 'status', 'quote');

    return order?.status?.status || global.t?.t('orders', 'status', 'in_progress');
  }, []);

  /* ─── estado ──────────────────────────────────────────────────────── */

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [orderTypeFilter, setOrderTypeFilter] = useState('sale');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [customFromInput, setCustomFromInput] = useState('');
  const [customToInput, setCustomToInput] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [dateValidationMessage, setDateValidationMessage] = useState('');

  /* ref para evitar fetch duplicado */
  const fetchingRef = useRef(false);

  const goToAddProduct = useCallback(() => {
    navigation.navigate('AddProductScreen', { forceCreate: true });
  }, [navigation]);

  /* ─── fetch (aceita página, acumula ou substitui) ────────────────── */

  const fetchPage = useCallback(async (targetPage, replace = false) => {
    if (!currentCompany?.id) { setOrders([]); return; }
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setError('');
      const query = {
        provider: `/people/${currentCompany.id}`,
        itemsPerPage: PAGE_SIZE,
        page: targetPage,
        'order[id]': 'desc',
      };
      if (orderTypeFilter !== 'all') query.orderType = orderTypeFilter;
      if (channelFilter !== 'all') query.app = channelFilter;
      if (statusFilter !== 'all') query['status.realStatus'] = statusFilter;
      const dateRange = getDateRange(dateFilter, customRange);
      if (dateRange?.after) query['orderDate[after]'] = dateRange.after;
      if (dateRange?.before) query['orderDate[before]'] = dateRange.before;

      const response = await orderActions.getItems(query);
      const items = Array.isArray(response) ? response : [];

      setOrders(prev => replace ? items : [...prev, ...items]);
      setPage(targetPage);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar o histórico.');
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [currentCompany?.id, orderTypeFilter, channelFilter, statusFilter, dateFilter, customRange, orderActions]);

  /* dispara reset ao focar ou trocar filtro de data/empresa */
  useEffect(() => {
    if (!isFocused) return;
    setOrders([]);
    fetchPage(1, true);
  }, [isFocused, fetchPage]);

  /* pull-to-refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOrders([]);
    fetchPage(1, true);
  }, [fetchPage]);

  /* scroll infinito — carrega próxima página */
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || fetchingRef.current) return;
    setLoadingMore(true);
    fetchPage(page + 1, false);
  }, [loadingMore, hasMore, page, fetchPage]);

  const handleScroll = useCallback(({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 60) loadMore();
  }, [loadMore]);

  /* ─── filtros client-side (canal, status, busca) ─────────────────── */

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.trim().toLowerCase().replace(/^#/, '');
    return orders.filter(o => getSearchText(o).includes(q));
  }, [orders, searchText]);

  /* ─── data personalizada ─────────────────────────────────────────── */

  const applyCustomRange = useCallback(() => {
    if (dateFilter !== 'custom') return;
    const fromVal = String(customFromInput || '').trim();
    const toVal = String(customToInput || '').trim();
    if (!fromVal && !toVal) { setDateValidationMessage(''); setCustomRange({ from: '', to: '' }); return; }
    const fromDate = fromVal ? parseDateInput(fromVal) : null;
    const toDate = toVal ? parseDateInput(toVal) : null;
    if ((fromVal && !fromDate) || (toVal && !toDate)) { setDateValidationMessage(global.t?.t('orders', 'validation', 'invalid_date_format')); return; }
    if (fromDate && toDate && fromDate > toDate) { setDateValidationMessage(global.t?.t('orders', 'validation', 'invalid_date_range')); return; }
    setDateValidationMessage('');
    setCustomRange({ from: fromVal, to: toVal });
  }, [customFromInput, customToInput, dateFilter]);

  const clearCustomRange = useCallback(() => {
    setCustomFromInput(''); setCustomToInput('');
    setDateValidationMessage(''); setCustomRange({ from: '', to: '' });
  }, []);

  const openOrder = useCallback(order => {
    navigation.navigate('OrderDetails', { order, kds: true });
  }, [navigation]);

  /* ─── card de pedido ─────────────────────────────────────────────── */

  const renderCard = useCallback(order => {
    const isPurchase = order.orderType === 'purchase';
    const isTransfer = order.orderType === 'transfer';
    const isLoss = order.orderType === 'loss';
    const channelLogo = (isPurchase || isTransfer || isLoss) ? null : getOrderChannelLogo(order);

    const channelLabel = isPurchase
      ? (order.client?.alias || order.client?.name || global.t?.t('orders', 'label', 'supplier'))
      : isTransfer
        ? global.t?.t('orders', 'label', 'stock_transfer')
        : isLoss
          ? global.t?.t('orders', 'label', 'stock_loss')
          : (getOrderChannelLabel(order) || normalizeApp(order) || global.t?.t('orders', 'label', 'shop'));

    const statusLabel = getStatusLabel(order);
    const statusColor = getStatusColor(order);
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
                {Formatter.formatDateYmdTodmY(order?.orderDate, true)}
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
  }, [getStatusLabel, openOrder]);

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

          {orderTypeFilter === 'sale' && (
            <>
              <Text style={styles.filterLabel}>{global.t?.t('orders', 'label', 'channel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {channelOptions.map(opt => (
                  <FilterChip key={`ch-${opt.key}`} active={channelFilter === opt.key} label={opt.label} onPress={() => setChannelFilter(opt.key)} />
                ))}
              </ScrollView>
            </>
          )}

          {!SIMPLE_TAB_KEYS.has(orderTypeFilter) && (
            <>
              <Text style={styles.filterLabel}>{global.t?.t('orders', 'label', 'status')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {statusOptions.map(opt => (
                  <FilterChip key={`st-${opt.key}`} active={statusFilter === opt.key} label={opt.label} onPress={() => setStatusFilter(opt.key)} />
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.filterLabel}>{global.t?.t('orders', 'label', 'period')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {dateFilterOptions.map(opt => (
              <FilterChip key={`dt-${opt.key}`} active={dateFilter === opt.key} label={opt.label} onPress={() => setDateFilter(opt.key)} />
            ))}
          </ScrollView>

          {dateFilter === 'custom' && (
            <View style={styles.customDateWrap}>
              <View style={styles.customDateInputs}>
                <TextInput value={customFromInput} onChangeText={setCustomFromInput} placeholder={global.t?.t('orders', 'placeholder', 'date_from')} placeholderTextColor="#94A3B8" style={[styles.searchInput, styles.dateInput]} />
                <TextInput value={customToInput} onChangeText={setCustomToInput} placeholder={global.t?.t('orders', 'placeholder', 'date_to')} placeholderTextColor="#94A3B8" style={[styles.searchInput, styles.dateInput]} />
              </View>
              {!!dateValidationMessage && <Text style={styles.validationText}>{dateValidationMessage}</Text>}
              <View style={styles.customDateActions}>
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={clearCustomRange}>
                  <Text style={styles.secondaryButtonText}>{global.t?.t('orders', 'button', 'clear')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: brandColors.primary }]} activeOpacity={0.9} onPress={applyCustomRange}>
                  <Text style={styles.primaryButtonText}>{global.t?.t('orders', 'button', 'apply_period')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* loading inicial */}
        {storeLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'loading_orders')}</Text>
          </View>
        )}

        {/* erro */}
        {!storeLoading && !!error && (
          <View style={styles.centerState}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'load_error')}</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        )}

        {/* vazio */}
        {!storeLoading && !error && filteredOrders.length === 0 && (
          <View style={styles.centerState}>
            <Icon name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.centerStateTitle}>{global.t?.t('orders', 'state', 'empty')}</Text>
            <Text style={styles.centerStateText}>{global.t?.t('orders', 'state', 'adjust_filters')}</Text>
          </View>
        )}

        {/* lista */}
        {!storeLoading && !error && (
          <View style={styles.list}>
            {filteredOrders.map(order => renderCard(order))}
          </View>
        )}

        {/* loading mais */}
        {loadingMore && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={brandColors.primary} />
          </View>
        )}

        {/* fim da lista */}
        {!storeLoading && !hasMore && filteredOrders.length > 0 && (
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 16 },

  heroCard: {
    borderRadius: 24, padding: 22,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 5,
  },
  heroCopy: { flex: 1, paddingRight: 16 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
  heroText: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)' },
  heroBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  countPill: { borderRadius: 999, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 7 },
  countPillText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

  filtersCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10 },
  filtersTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  searchInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#fff' },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#1D4ED8' },

  customDateWrap: { gap: 10, marginTop: 2 },
  customDateInputs: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  validationText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  customDateActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  primaryButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1F5F9' },
  secondaryButtonText: { color: '#334155', fontSize: 12, fontWeight: '700' },

  centerState: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  centerStateTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  centerStateText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  list: { gap: 12 },

  orderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  orderIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  channelLogo: { width: 22, height: 22 },
  orderId: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  orderDate: { fontSize: 12, color: '#64748B', marginTop: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  tabBar: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabLabelActive: { fontWeight: '700' },

  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  channelText: { fontSize: 13, fontWeight: '600', color: '#475569', flex: 1 },
  priceText: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  purchasePriceText: { color: '#D97706' },
  transferPriceText: { color: '#7C3AED' },
  lossPriceText: { color: '#DC2626' },
  orderIconWrapPurchase: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  orderIconWrapTransfer: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  orderIconWrapLoss: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  endText: { textAlign: 'center', fontSize: 12, color: '#CBD5E1', paddingVertical: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

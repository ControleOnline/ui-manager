import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { useStore } from '@store';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

const TERMINAL_STATUS_PATTERN = /cancel|closed|fechad|finaliz|entreg/i;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_LABELS = {
  open: 'Aberto',
  closed: 'Fechado',
  cancel: 'Cancelado',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  pending: 'Pendente',
  paid: 'Pago',
};

const shadowStyle = {
  boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
};

const CHANNEL_PRESETS = ['99Food', 'iFood', 'SHOP'];
const STATUS_PRESETS = ['open', 'pending', 'paid', 'closed', 'cancelled'];

const DATE_FILTER_OPTIONS = [
  { key: 'all', label: 'Todo periodo' },
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const pad2 = value => String(value).padStart(2, '0');

const formatDateToApi = date =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

const parseDateInput = value => {
  const normalized = String(value || '').trim();
  if (!DATE_INPUT_PATTERN.test(normalized)) return null;

  const [year, month, day] = normalized.split('-').map(part => Number(part));
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const extractOrderCode = order => {
  const entries = Array.isArray(order?.extraData) ? order.extraData : [];
  const codeEntry = entries.find(item => item?.extra_fields?.name === 'code' && item?.value);
  return String(codeEntry?.value || '').trim();
};

const getSearchText = order =>
  [
    order?.id,
    order?.app,
    order?.status?.status,
    order?.status?.realStatus,
    extractOrderCode(order),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getStatusTone = order => {
  const realStatus = String(order?.status?.realStatus || '').toLowerCase();
  const label = String(order?.status?.status || '').toLowerCase();

  if (TERMINAL_STATUS_PATTERN.test(realStatus) || TERMINAL_STATUS_PATTERN.test(label)) {
    return {
      backgroundColor: '#FEF2F2',
      textColor: '#B91C1C',
      label: STATUS_LABELS[realStatus] || STATUS_LABELS[label] || 'Terminal',
    };
  }

  if (realStatus === 'open' || label === 'open') {
    return {
      backgroundColor: '#ECFDF5',
      textColor: '#047857',
      label: 'Aberto',
    };
  }

  return {
    backgroundColor: '#EFF6FF',
    textColor: '#1D4ED8',
    label: STATUS_LABELS[realStatus] || STATUS_LABELS[label] || 'Em andamento',
  };
};

const getDateRange = (dateFilter, customRange) => {
  const now = new Date();

  if (dateFilter === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }

  if (dateFilter === '7d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }

  if (dateFilter === '30d') {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { after: formatDateToApi(start), before: formatDateToApi(now) };
  }

  if (dateFilter === 'custom') {
    const from = parseDateInput(customRange?.from);
    const to = parseDateInput(customRange?.to);

    if (!from && !to) return {};

    if (from) {
      from.setHours(0, 0, 0, 0);
    }
    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    return {
      after: from ? formatDateToApi(from) : null,
      before: to ? formatDateToApi(to) : null,
    };
  }

  return {};
};

const FilterChip = ({ active, label, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    activeOpacity={0.9}
    onPress={onPress}>
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function OrderHistoryPage({ navigation }) {
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');

  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { actions: orderActions } = ordersStore;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [customFromInput, setCustomFromInput] = useState('');
  const [customToInput, setCustomToInput] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [dateValidationMessage, setDateValidationMessage] = useState('');

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

  const channelOptions = useMemo(() => {
    const dynamicChannels = orders
      .map(order => String(order?.app || '').trim())
      .filter(Boolean);

    const normalized = new Set([
      ...CHANNEL_PRESETS,
      ...dynamicChannels,
      channelFilter !== 'all' ? channelFilter : null,
    ]);

    return [
      { key: 'all', label: 'Todos' },
      ...Array.from(normalized)
        .filter(Boolean)
        .map(value => ({ key: value, label: value })),
    ];
  }, [channelFilter, orders]);

  const statusOptions = useMemo(() => {
    const dynamicStatuses = orders
      .map(order => String(order?.status?.realStatus || '').toLowerCase())
      .filter(Boolean);

    const normalized = new Set([
      ...STATUS_PRESETS,
      ...dynamicStatuses,
      statusFilter !== 'all' ? statusFilter : null,
    ]);

    return [
      { key: 'all', label: 'Todos' },
      ...Array.from(normalized)
        .filter(Boolean)
        .map(value => ({
          key: value,
          label: STATUS_LABELS[value] || value,
        })),
    ];
  }, [orders, statusFilter]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = String(searchText || '').trim().toLowerCase();
    if (!normalizedSearch) return orders;

    return orders.filter(order => getSearchText(order).includes(normalizedSearch));
  }, [orders, searchText]);

  const loadOrders = useCallback(async () => {
    if (!currentCompany?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setError('');
      const query = {
        provider: `/people/${currentCompany.id}`,
        orderType: 'sale',
        itemsPerPage: 200,
        page: 1,
        order: { alterDate: 'DESC' },
      };

      if (channelFilter !== 'all') {
        query.app = channelFilter;
      }

      if (statusFilter !== 'all') {
        query['status.realStatus'] = statusFilter;
      }

      const dateRange = getDateRange(dateFilter, customRange);
      if (dateRange?.after) {
        query['alterDate[after]'] = dateRange.after;
      }
      if (dateRange?.before) {
        query['alterDate[before]'] = dateRange.before;
      }

      const response = await orderActions.getItems(query);
      setOrders(Array.isArray(response) ? response : []);
    } catch (fetchError) {
      setError(fetchError?.message || global.t?.t('configs', 'title', 'unableToLoadHistory'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [
    channelFilter,
    currentCompany?.id,
    customRange,
    dateFilter,
    orderActions,
    statusFilter,
  ]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders();
    }, [loadOrders]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  const openOrder = useCallback(
    order => {
      navigation.navigate('OrderDetails', { order, kds: true });
    },
    [navigation],
  );

  const applyCustomRange = useCallback(() => {
    if (dateFilter !== 'custom') return;

    const fromValue = String(customFromInput || '').trim();
    const toValue = String(customToInput || '').trim();

    if (!fromValue && !toValue) {
      setDateValidationMessage('');
      setCustomRange({ from: '', to: '' });
      return;
    }

    const fromDate = fromValue ? parseDateInput(fromValue) : null;
    const toDate = toValue ? parseDateInput(toValue) : null;

    if ((fromValue && !fromDate) || (toValue && !toDate)) {
      setDateValidationMessage('Use o formato AAAA-MM-DD');
      return;
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      setDateValidationMessage('Data inicial nao pode ser maior que a final');
      return;
    }

    setDateValidationMessage('');
    setCustomRange({ from: fromValue, to: toValue });
  }, [customFromInput, customToInput, dateFilter]);

  const clearCustomRange = useCallback(() => {
    setCustomFromInput('');
    setCustomToInput('');
    setDateValidationMessage('');
    setCustomRange({ from: '', to: '' });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        }>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Pedidos</Text>
            <Text style={styles.heroTitle}>{global.t?.t('configs', 'title', 'orderHistory') || 'Order History'}</Text>
            <Text style={styles.heroText}>
              {global.t?.t('configs', 'title', 'orderHistoryResume') ||
                'Historico completo das ordens com filtros por canal, data e status.'}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="clock" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.sectionTitle}>{global.t?.t('configs', 'title', 'activeCompany')}</Text>
            <Text style={styles.companyName}>
              {currentCompany?.name || currentCompany?.alias || global.t?.t('configs', 'title', 'selectCompany')}
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredOrders.length} pedidos</Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros avancados</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por pedido, canal ou codigo"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          <Text style={styles.filterLabel}>Canal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {channelOptions.map(option => (
              <FilterChip
                key={`channel-${option.key}`}
                active={channelFilter === option.key}
                label={option.label}
                onPress={() => setChannelFilter(option.key)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {statusOptions.map(option => (
              <FilterChip
                key={`status-${option.key}`}
                active={statusFilter === option.key}
                label={option.label}
                onPress={() => setStatusFilter(option.key)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Periodo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {DATE_FILTER_OPTIONS.map(option => (
              <FilterChip
                key={`period-${option.key}`}
                active={dateFilter === option.key}
                label={option.label}
                onPress={() => setDateFilter(option.key)}
              />
            ))}
          </ScrollView>

          {dateFilter === 'custom' ? (
            <View style={styles.customDateWrap}>
              <View style={styles.customDateInputs}>
                <TextInput
                  value={customFromInput}
                  onChangeText={setCustomFromInput}
                  placeholder="Inicio (AAAA-MM-DD)"
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, styles.dateInput]}
                />
                <TextInput
                  value={customToInput}
                  onChangeText={setCustomToInput}
                  placeholder="Fim (AAAA-MM-DD)"
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, styles.dateInput]}
                />
              </View>

              {!!dateValidationMessage ? (
                <Text style={styles.validationText}>{dateValidationMessage}</Text>
              ) : null}

              <View style={styles.customDateActions}>
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={clearCustomRange}>
                  <Text style={styles.secondaryButtonText}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={applyCustomRange}>
                  <Text style={styles.primaryButtonText}>Aplicar periodo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text style={styles.centerStateTitle}>{global.t?.t('configs', 'title', 'loadingHistory')}</Text>
            <Text style={styles.centerStateText}>{global.t?.t('configs', 'title', 'fetchingOrders')}</Text>
          </View>
        ) : null}

        {!loading && !!error ? (
          <View style={styles.centerState}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.centerStateTitle}>{global.t?.t('configs', 'title', 'unableToLoadHistory')}</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && filteredOrders.length === 0 ? (
          <View style={styles.centerState}>
            <Icon name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.centerStateTitle}>{global.t?.t('configs', 'title', 'noOrdersFound')}</Text>
            <Text style={styles.centerStateText}>
              {global.t?.t('configs', 'title', 'noOrdersFoundMessage')}
            </Text>
          </View>
        ) : null}

        {!loading && !error ? (
          <View style={styles.list}>
            {filteredOrders.map(order => {
              const tone = getStatusTone(order);

              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.9}
                  onPress={() => openOrder(order)}
                  style={styles.orderCard}>
                  <View style={styles.orderTopRow}>
                    <View style={[styles.statusHint, { backgroundColor: tone.backgroundColor }]}>
                      <Text style={[styles.statusHintText, { color: tone.textColor }]}>
                        {tone.label}
                      </Text>
                    </View>
                    <Icon name="arrow-up-right" size={18} color="#64748B" />
                  </View>

                  <OrderHeader order={order} showCustomer compact />

                  <View style={styles.orderFooter}>
                    <Text style={styles.orderFooterText}>
                      {global.t?.t('configs', 'title', 'tapToViewDetails')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
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
  summaryRow: {
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
  countPill: {
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  filtersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#fff',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#1D4ED8',
  },
  customDateWrap: {
    gap: 10,
    marginTop: 2,
  },
  customDateInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  validationText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  customDateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  centerState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 18,
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
  list: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusHint: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusHintText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderFooter: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: withOpacity('#CBD5E1', 0.7),
  },
  orderFooterText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});

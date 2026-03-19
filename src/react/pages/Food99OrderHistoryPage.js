import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

const FOOD99_APP_PATTERN = /99\s*food|food99/i;
const TERMINAL_STATUS_PATTERN = /cancel|closed|fechad/i;

const shadowStyle = {
  boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
};

const matchesFood99Order = order =>
  FOOD99_APP_PATTERN.test(String(order?.app || ''));

const getStatusTone = order => {
  const realStatus = String(order?.status?.realStatus || '').toLowerCase();
  const label = String(order?.status?.status || '').toLowerCase();

  if (TERMINAL_STATUS_PATTERN.test(realStatus) || TERMINAL_STATUS_PATTERN.test(label)) {
    return {
      backgroundColor: '#FEF2F2',
      textColor: '#B91C1C',
      label: 'Terminal',
    };
  }

  if (realStatus === 'open') {
    return {
      backgroundColor: '#ECFDF5',
      textColor: '#047857',
      label: 'Aberto',
    };
  }

  return {
    backgroundColor: '#EFF6FF',
    textColor: '#1D4ED8',
    label: 'Em andamento',
  };
};

export default function Food99OrderHistoryPage({ navigation }) {
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

  const loadOrders = useCallback(async () => {
    if (!currentCompany?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setError('');
      let response = await orderActions.getItems({
        provider: `/people/${currentCompany.id}`,
        orderType: 'sale',
        app: '99Food',
        itemsPerPage: 100,
        page: 1,
        order: { alterDate: 'DESC' },
      });

      if (!Array.isArray(response) || response.length === 0) {
        response = await orderActions.getItems({
          provider: `/people/${currentCompany.id}`,
          orderType: 'sale',
          itemsPerPage: 200,
          page: 1,
          order: { alterDate: 'DESC' },
        });
      }

      const fetchedOrders = Array.isArray(response) ? response : [];
      setOrders(fetchedOrders.filter(matchesFood99Order));
    } catch (fetchError) {
      setError(fetchError?.message || 'Nao foi possivel carregar o historico 99Food.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, orderActions]);

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
      navigation.navigate('OrderDetails', { order });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        }>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>99Food</Text>
            <Text style={styles.heroTitle}>Historico de pedidos</Text>
            <Text style={styles.heroText}>
              Consulte rapidamente pedidos da 99Food, incluindo cancelados e concluidos, e abra o detalhe para ver o estado da integracao.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="clock" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.sectionTitle}>Empresa ativa</Text>
            <Text style={styles.companyName}>
              {currentCompany?.name || currentCompany?.alias || 'Selecione uma empresa'}
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{orders.length} pedidos</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={brandColors.primary} />
            <Text style={styles.centerStateTitle}>Carregando historico 99Food</Text>
            <Text style={styles.centerStateText}>
              Buscando pedidos da empresa ativa.
            </Text>
          </View>
        ) : null}

        {!loading && !!error ? (
          <View style={styles.centerState}>
            <Icon name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.centerStateTitle}>Nao foi possivel carregar</Text>
            <Text style={styles.centerStateText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && orders.length === 0 ? (
          <View style={styles.centerState}>
            <Icon name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.centerStateTitle}>Nenhum pedido 99Food encontrado</Text>
            <Text style={styles.centerStateText}>
              Se existirem pedidos na API com outro nome de app, ajustamos o filtro depois.
            </Text>
          </View>
        ) : null}

        {!loading && !error ? (
          <View style={styles.list}>
            {orders.map(order => {
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
                      Toque para abrir o detalhe e ver o estado remoto da 99Food.
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
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
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

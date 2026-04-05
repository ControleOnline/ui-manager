import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';

const cardShadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#0EA5E9',
  purple:  '#8B5CF6',
};

const PAYMENT_ICONS = {
  dinheiro: 'dollar-sign',
  pix:      'zap',
  debito:   'credit-card',
  credito:  'credit-card',
  default:  'hash',
};

const paymentIcon = label => {
  const l = String(label || '').toLowerCase();
  if (l.includes('pix'))    return PAYMENT_ICONS.pix;
  if (l.includes('debit'))  return PAYMENT_ICONS.debito;
  if (l.includes('crédit') || l.includes('credit')) return PAYMENT_ICONS.credito;
  if (l.includes('dinh'))   return PAYMENT_ICONS.dinheiro;
  return PAYMENT_ICONS.default;
};

const getIsOpen = configs => {
  const closed = configs?.['cash-wallet-closed-id'];
  return closed === 0 || closed === '0' || closed === undefined || closed === null;
};

const confirm = (msg, cb) => {
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) cb();
  } else {
    Alert.alert('Confirmação', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: cb },
    ]);
  }
};

const CashRegisterDetailPage = () => {
  const route = useRoute();
  const { deviceString, alias, configs: initialConfigs } = route.params || {};

  const invoiceStore      = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const peopleStore       = useStore('people');
  const themeStore        = useStore('theme');

  const { currentCompany }      = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const actionsRef = useRef({});
  actionsRef.current = {
    invoiceActions:      invoiceStore.actions,
    deviceConfigActions: deviceConfigStore.actions,
  };

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const [products,      setProducts]      = useState([]);
  const [inflowData,    setInflowData]    = useState(null);
  const [configs,       setConfigs]       = useState(initialConfigs || {});
  const [loadingData,   setLoadingData]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search,        setSearch]        = useState('');

  const isOpen = useMemo(() => getIsOpen(configs), [configs]);

  const loadData = useCallback(async () => {
    if (!currentCompany?.id || !deviceString) return;
    setLoadingData(true);
    try {
      const [cashData, inflowRaw] = await Promise.all([
        actionsRef.current.invoiceActions.getCashRegister({
          device:   deviceString,
          provider: currentCompany.id,
        }),
        actionsRef.current.invoiceActions.getInflow({
          'device.device': deviceString,
          receiver:        currentCompany.id,
        }),
      ]);

      setProducts(Array.isArray(cashData) ? cashData : []);

      // getInflow retorna data['member'] = [{ payments: {...} }]
      const member = Array.isArray(inflowRaw) ? inflowRaw : [];
      setInflowData(member[0]?.payments || null);
    } catch {
      setProducts([]);
      setInflowData(null);
    } finally {
      setLoadingData(false);
    }
  }, [currentCompany?.id, deviceString]);

  const refreshConfigs = useCallback(async () => {
    if (!currentCompany?.id) return;
    const items = await actionsRef.current.deviceConfigActions.getItems({
      people: `/people/${currentCompany.id}`,
    });
    const dc = (items || []).find(
      d => d.device?.device === deviceString,
    );
    if (dc) setConfigs(dc.configs || {});
  }, [currentCompany?.id, deviceString]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleToggle = () => {
    const msg = isOpen ? 'Deseja fechar o caixa?' : 'Deseja abrir o caixa?';
    confirm(msg, async () => {
      setActionLoading(true);
      try {
        const action = isOpen
          ? actionsRef.current.invoiceActions.closeCashRegister
          : actionsRef.current.invoiceActions.openCashRegister;
        await action({ device: deviceString, provider: currentCompany.id });
        await refreshConfigs();
        await loadData();
      } catch {
        // silencioso
      } finally {
        setActionLoading(false);
      }
    });
  };

  // Totais derivados
  const productTotal = useMemo(
    () => products.reduce((s, p) => s + Number(p.order_product_total || 0), 0),
    [products],
  );

  const inflowTotal = inflowData?.total ?? productTotal;

  const wallets = useMemo(() => {
    if (!inflowData?.wallet) return [];
    return Object.values(inflowData.wallet).map(w => ({
      wallet:   w.wallet,
      total:    w.total || 0,
      payments: Object.values(w.payment || {}).filter(pt => (pt.inflow || 0) > 0),
    }));
  }, [inflowData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      String(p.product_name || '').toLowerCase().includes(term) ||
      String(p.product_sku  || '').toLowerCase().includes(term),
    );
  }, [products, search]);

  const accent = isOpen ? hex.success : hex.danger;

  const renderProduct = ({ item, index }) => (
    <View style={[styles.productRow, index % 2 === 0 && styles.productRowAlt]}>
      <Text style={[styles.productCell, { flex: 0.5 }]}>{item.quantity}</Text>
      <View style={{ flex: 3 }}>
        <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
        {!!item.product_sku && (
          <Text style={styles.productSku}>{item.product_sku}</Text>
        )}
      </View>
      <Text style={[styles.productCell, { flex: 1.2, textAlign: 'right' }]}>
        {Formatter.formatMoney(item.order_product_price)}
      </Text>
      <Text style={[styles.productCell, { flex: 1.3, textAlign: 'right', fontWeight: '700' }]}>
        {Formatter.formatMoney(item.order_product_total)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore store="invoice" />
      <StateStore store="device_config" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho do dispositivo */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceHeaderLeft}>
            <View style={[styles.deviceIconBox, { backgroundColor: withOpacity(accent, 0.1) }]}>
              <Icon name="monitor" size={20} color={accent} />
            </View>
            <View>
              <Text style={styles.deviceAlias}>{alias}</Text>
              <Text style={styles.deviceString}>{deviceString}</Text>
            </View>
          </View>

          <View style={styles.deviceHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: withOpacity(accent, 0.12), borderColor: withOpacity(accent, 0.4) }]}>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={[styles.statusText, { color: accent }]}>
                {isOpen ? 'Aberto' : 'Fechado'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: isOpen ? hex.danger : hex.success }, actionLoading && { opacity: 0.6 }]}
              onPress={handleToggle}
              disabled={actionLoading || loadingData}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name={isOpen ? 'lock' : 'unlock'} size={13} color="#fff" />
                  <Text style={styles.toggleBtnText}>{isOpen ? 'Fechar' : 'Abrir'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loadingData && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Carregando dados do caixa...</Text>
          </View>
        )}

        {/* Cards de resumo */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Icon name="dollar-sign" size={14} color={hex.success} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Total Geral</Text>
            <Text style={[styles.summaryValue, { color: hex.success }]}>
              {Formatter.formatMoney(inflowTotal)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="shopping-bag" size={14} color={hex.info} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Em Produtos</Text>
            <Text style={[styles.summaryValue, { color: hex.info }]}>
              {Formatter.formatMoney(productTotal)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="package" size={14} color={hex.purple} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Itens</Text>
            <Text style={[styles.summaryValue, { color: hex.purple }]}>
              {products.length}
            </Text>
          </View>
        </View>

        {/* Pagamentos por forma */}
        {wallets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Recebimentos por Forma de Pagamento
            </Text>
            {wallets.map((wallet, wi) => (
              <View key={wi} style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Icon name="briefcase" size={13} color="#64748B" />
                  <Text style={styles.walletName}>{wallet.wallet || 'Carteira'}</Text>
                  <Text style={[styles.walletTotal, { color: brandColors.primary }]}>
                    {Formatter.formatMoney(wallet.total)}
                  </Text>
                </View>
                {wallet.payments.map((pt, pi) => (
                  <View key={pi} style={styles.paymentRow}>
                    <View style={[styles.paymentIconBox, { backgroundColor: withOpacity(hex.info, 0.1) }]}>
                      <Icon name={paymentIcon(pt.payment)} size={11} color={hex.info} />
                    </View>
                    <Text style={styles.paymentName}>{pt.payment || '-'}</Text>
                    <Text style={styles.paymentValue}>
                      {Formatter.formatMoney(pt.inflow)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Produtos vendidos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="shopping-bag" size={13} /> {'  '}Produtos Vendidos
          </Text>

          {/* Filtro de busca */}
          <View style={styles.searchRow}>
            <Icon name="search" size={14} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar produto ou SKU..."
              placeholderTextColor="#94A3B8"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="x" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {filteredProducts.length > 0 ? (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHead, { flex: 0.5 }]}>Qtd</Text>
                <Text style={[styles.tableHead, { flex: 3 }]}>Produto</Text>
                <Text style={[styles.tableHead, { flex: 1.2, textAlign: 'right' }]}>Unit.</Text>
                <Text style={[styles.tableHead, { flex: 1.3, textAlign: 'right' }]}>Total</Text>
              </View>
              <FlatList
                data={filteredProducts}
                keyExtractor={(item, i) => `${item.product_sku || i}`}
                renderItem={renderProduct}
                scrollEnabled={false}
              />
              <View style={styles.tableFooter}>
                <Text style={styles.tableFooterLabel}>Total em produtos</Text>
                <Text style={[styles.tableFooterValue, { color: brandColors.primary }]}>
                  {Formatter.formatMoney(productTotal)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="inbox" size={24} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>
                {search ? 'Nenhum produto encontrado para esta busca' : 'Nenhum produto registrado neste caixa'}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },

  /* Cabeçalho do device */
  deviceHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...cardShadow,
  },
  deviceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  deviceIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceAlias:   { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  deviceString:  { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  deviceHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Loading */
  loadingBox:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  /* Resumo */
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 12, ...cardShadow,
  },
  summaryIcon:  { marginBottom: 6 },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: 0.3, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  /* Seção */
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#334155',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  /* Carteiras / pagamentos */
  walletCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    gap: 8, ...cardShadow,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletName:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  walletTotal:  { fontSize: 15, fontWeight: '800' },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  paymentIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  paymentName:    { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  paymentValue:   { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Tabela de produtos */
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  tableContainer: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...cardShadow,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tableHead: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 },
  productRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, alignItems: 'flex-start' },
  productRowAlt: { backgroundColor: '#F8FAFC' },
  productCell:   { fontSize: 12, color: '#334155', fontWeight: '500' },
  productName:   { fontSize: 12, color: '#334155', fontWeight: '600' },
  productSku:    { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  tableFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tableFooterLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  tableFooterValue: { fontSize: 17, fontWeight: '900' },

  /* Vazio */
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 28,
    alignItems: 'center', ...cardShadow,
  },
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});

export default CashRegisterDetailPage;

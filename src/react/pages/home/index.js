import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-animatable';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

// Hex fixos para uso com withOpacity (CSS vars não são suportadas)
const HEX = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F97316',
  muted: '#64748B',
};

function ShortcutCard({ label, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.shortcutCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.shortcutIcon, { backgroundColor: withOpacity(color, 0.12) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionSummary({ items, loading }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.sectionSummaryRow}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.sectionSummaryItem}>
          {loading ? (
            <ActivityIndicator size="small" color={HEX.muted} />
          ) : (
            <Text style={styles.sectionSummaryValue}>{item.value}</Text>
          )}
          <Text style={styles.sectionSummaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionBlock({ title, icon, color, summary, loadingSummary, last, children }) {
  return (
    <View style={[styles.sectionBlock, last && { marginBottom: 0 }]}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(color, 0.12) }]}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <SectionSummary items={summary} loading={loadingSummary} />
      {children}
    </View>
  );
}

function ShortcutsRow({ children, last }) {
  return <View style={[styles.shortcutsRow, last && { marginBottom: 0 }]}>{children}</View>;
}

export default function HomePage({ navigation }) {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const authStore = useStore('auth');

  const { colors: themeColors } = themeStore.getters;
  const { currentCompany } = peopleStore.getters;
  const { user: authUser } = authStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [stats, setStats] = useState([
    { label: 'Pedidos', value: '...', icon: 'shopping-bag', color: HEX.info, route: 'OrderHistoryPage' },
    { label: 'Clientes', value: '...', icon: 'users', color: HEX.success, route: 'ClientsIndex' },
    { label: 'Caixas', value: '...', icon: 'credit-card', color: HEX.warning, route: 'CashRegistersIndex' },
  ]);
  const [loadingStats, setLoadingStats] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [summaries, setSummaries] = useState({
    financeiro: [
      { label: 'Receber (mês)', value: '...' },
      { label: 'Pagar (mês)', value: '...' },
    ],
    operacoes: [
      { label: 'Pedidos', value: '...' },
      { label: 'Produtos', value: '...' },
    ],
  });

  useEffect(() => {
    if (!currentCompany?.id) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [ordersRes, clientsRes, cashRes, incomeRes, productsRes] =
          await Promise.all([
            api.fetch('/orders', { params: { provider: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/people', { params: { 'link.company': `/people/${currentCompany.id}`, 'link.linkType': 'client', itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/cash-registers', { params: { company: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/income_statements', { params: { people: currentCompany.id, year: currentYear } }).catch(() => null),
            api.fetch('/products', { params: { company: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
          ]);

        const incomeData = incomeRes?.member;
        const monthKey = String(currentMonth);
        const monthData = incomeData?.[monthKey] || null;
        const receiveTotal = typeof monthData?.receive === 'object' && !Array.isArray(monthData?.receive)
          ? (monthData.receive?.total_month_price ?? null)
          : null;
        const payTotal = typeof monthData?.pay === 'object' && !Array.isArray(monthData?.pay)
          ? (monthData.pay?.total_month_price ?? null)
          : null;

        setStats([
          { label: 'Pedidos', value: String(ordersRes?.totalItems ?? '—'), icon: 'shopping-bag', color: HEX.info, route: 'OrderHistoryPage' },
          { label: 'Clientes', value: String(clientsRes?.totalItems ?? '—'), icon: 'users', color: HEX.success, route: 'ClientsIndex' },
          { label: 'Caixas', value: String(cashRes?.totalItems ?? '—'), icon: 'credit-card', color: HEX.warning, route: 'CashRegistersIndex' },
        ]);

        setSummaries({
          financeiro: [
            { label: 'Receber (mês)', value: receiveTotal !== null ? Formatter.formatMoney(receiveTotal) : '—' },
            { label: 'Pagar (mês)', value: payTotal !== null ? Formatter.formatMoney(payTotal) : '—' },
          ],
          operacoes: [
            { label: 'Pedidos', value: String(ordersRes?.totalItems ?? '—') },
            { label: 'Produtos', value: String(productsRes?.totalItems ?? '—') },
          ],
        });
      } catch (_) {
        // mantém os valores padrão
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentCompany?.id]);

  const go = (route) => navigation.navigate(route);

  if (!currentCompany || !themeColors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEX.info} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: brandColors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <Text style={styles.overviewLabel}>Visão Geral do Gerente</Text>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => go(stat.route)}
            >
              <View style={[styles.statIcon, { backgroundColor: withOpacity(stat.color, 0.12) }]}>
                <Icon name={stat.icon} size={17} color={stat.color} />
              </View>
              {loadingStats ? (
                <ActivityIndicator size="small" color={stat.color} style={{ marginVertical: 5 }} />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner — Resultado */}
        <TouchableOpacity
          style={[styles.actionBanner, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.9}
          onPress={() => go('IncomeStatement')}
        >
          <View style={styles.actionContent}>
            <View>
              <Text style={styles.actionTitle}>Resultado do período</Text>
              <Text style={styles.actionSub}>Veja o DRE e desempenho financeiro</Text>
            </View>
            <View style={styles.actionArrow}>
              <Icon name="arrow-right" size={20} color={brandColors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Bloco Financeiro */}
        <SectionBlock
          title="Financeiro"
          icon="dollar-sign"
          color={HEX.info}
          summary={summaries.financeiro}
          loadingSummary={loadingStats}
        >
          <ShortcutsRow>
            <ShortcutCard label="Contas a Receber" icon="arrow-up-circle" color={HEX.success} onPress={() => go('Receivables')} />
            <ShortcutCard label="Contas a Pagar" icon="arrow-down-circle" color={HEX.error} onPress={() => go('Payables')} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label="Transferências" icon="repeat" color={HEX.purple} onPress={() => go('OwnTransfers')} />
            <ShortcutCard label="Caixa" icon="credit-card" color={HEX.warning} onPress={() => go('CashRegistersIndex')} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco Operações */}
        <SectionBlock
          title="Operações"
          icon="shopping-bag"
          color={HEX.warning}
          summary={summaries.operacoes}
          loadingSummary={loadingStats}
        >
          <ShortcutsRow>
            <ShortcutCard label="Histórico de Pedidos" icon="clock" color={HEX.info} onPress={() => go('OrderHistoryPage')} />
            <ShortcutCard label="Produtos" icon="package" color={HEX.success} onPress={() => go('CategoriesPage')} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label="Estoque" icon="archive" color={HEX.warning} onPress={() => go('InventoriesPage')} />
            <ShortcutCard label="Sugestão de Compra" icon="truck" color={HEX.purple} onPress={() => go('PurchasingSuggestion')} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label="Registrar Compra" icon="shopping-cart" color={HEX.success} onPress={() => go('PurchaseFormPage')} />
            <View style={{ flex: 1 }} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco Clientes e CRM */}
        <SectionBlock title="Clientes e CRM" icon="users" color={HEX.success}>
          <ShortcutsRow>
            <ShortcutCard label="Clientes" icon="users" color={HEX.success} onPress={() => go('ClientsIndex')} />
            <ShortcutCard label="Fornecedores" icon="briefcase" color={HEX.warning} onPress={() => go('ProvidersIndex')} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label="Preferências CRM" icon="settings" color={HEX.muted} onPress={() => go('CRMSettings')} />
            <View style={{ flex: 1 }} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco PPC e Integrações */}
        <SectionBlock title="PPC e Integrações" icon="monitor" color={HEX.purple} last>
          <ShortcutsRow>
            <ShortcutCard label="Displays PPC" icon="monitor" color={HEX.purple} onPress={() => go('DisplayList')} />
            <ShortcutCard label="Integrações" icon="link" color={HEX.info} onPress={() => go('IntegrationsPage')} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label="Conexões" icon="radio" color={HEX.success} onPress={() => go('ConnectionsPage')} />
            <View style={{ flex: 1 }} />
          </ShortcutsRow>
        </SectionBlock>

      </ScrollView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  overviewLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...cardShadow,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  actionBanner: {
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
      web: { boxShadow: '0 8px 24px rgba(79,70,229,0.2)' },
    }),
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  actionArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.2,
  },

  sectionSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sectionSummaryItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSummaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    ...cardShadow,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
});

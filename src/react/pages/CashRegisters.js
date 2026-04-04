import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger: '#EF4444',
};

const CashRegisters = () => {
  const peopleStore = useStore('people');
  const invoiceStore = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const themeStore = useStore('theme');

  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { isLoading: isLoadingInvoices } = invoiceStore.getters;
  const { items: deviceConfigs, isLoading: isLoadingDevices } = deviceConfigStore.getters;
  const deviceConfigActions = deviceConfigStore.actions;
  const invoiceActions = invoiceStore.actions;

  const [inflowsByDevice, setInflowsByDevice] = useState({});

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  useEffect(() => {
    if (currentCompany?.id) {
      deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
    }
  }, [currentCompany?.id, deviceConfigActions]);

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || !deviceConfigs?.length) return;
      const promises = deviceConfigs.map(deviceConfig => {
        const device = String(deviceConfig?.device?.device || '').replace(/\D/g, '');
        return invoiceActions
          .getInflow({
            receiver: currentCompany.id,
            'device.device': device,
          })
          .then(data => ({ [deviceConfig.device.id]: data }));
      });
      setInflowsByDevice({});
      Promise.all(promises).then(results => {
        const next = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setInflowsByDevice(next);
      });
    }, [currentCompany?.id, deviceConfigs, invoiceActions]),
  );

  const summary = useMemo(() => {
    let total = 0;
    let walletCount = 0;
    Object.values(inflowsByDevice).forEach(data => {
      const first = Array.isArray(data) ? data[0] : null;
      const wallet = first?.payments?.wallet || {};
      const groups = Object.values(wallet);
      walletCount += groups.length;
      total += Number(first?.payments?.total || 0);
    });
    return {
      devices: deviceConfigs?.length || 0,
      wallets: walletCount,
      total,
    };
  }, [inflowsByDevice, deviceConfigs]);

  const renderDevice = deviceConfig => {
    const deviceData = inflowsByDevice[deviceConfig.device.id]?.[0] || null;
    const walletGroups = deviceData?.payments?.wallet ? Object.values(deviceData.payments.wallet) : [];
    const deviceTotal = Number(deviceData?.payments?.total || 0);

    return (
      <View key={deviceConfig.id} style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceTitle}>{deviceConfig.device.alias}</Text>
          <View style={[styles.badge, { backgroundColor: withOpacity(hex.primary, 0.12), borderColor: withOpacity(hex.primary, 0.45) }]}>
            <Text style={[styles.badgeText, { color: hex.primary }]}>{walletGroups.length} carteiras</Text>
          </View>
        </View>

        {walletGroups.length === 0 ? (
          <View style={styles.emptyDevice}>
            <Text style={styles.emptyDeviceText}>Nenhum resultado encontrado</Text>
          </View>
        ) : (
          <View style={styles.walletGrid}>
            {walletGroups.map((group, idx) => (
              <View key={`${deviceConfig.id}-${group.wallet}-${idx}`} style={styles.walletCard}>
                <Text style={styles.walletName}>{group.wallet}</Text>
                {Object.values(group.payment || {}).map((payment, index) => (
                  <View key={`${group.wallet}-${payment.payment}-${index}`} style={styles.paymentLine}>
                    <Text
                      style={[
                        styles.paymentLabel,
                        Number(payment.withdrawal || 0) > 0 && { color: hex.danger },
                      ]}
                      numberOfLines={1}
                    >
                      {Number(payment.withdrawal || 0) > 0 ? `Sangria ${group.wallet}` : payment.payment}
                    </Text>
                    <Text
                      style={[
                        styles.paymentValue,
                        Number(payment.withdrawal || 0) > 0 && { color: hex.danger },
                      ]}
                    >
                      {Number(payment.withdrawal || 0) > 0
                        ? Formatter.formatMoney(payment.withdrawal)
                        : Number(payment.inflow || 0) > 0
                          ? Formatter.formatMoney(payment.inflow)
                          : Formatter.formatMoney(0)}
                    </Text>
                  </View>
                ))}
                <View style={styles.walletFooter}>
                  <Text style={styles.walletFooterLabel}>Total</Text>
                  <Text style={[styles.walletFooterValue, { color: brandColors.primary }]}>
                    {Formatter.formatMoney(group.total || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.deviceTotal}>
          <Text style={styles.deviceTotalLabel}>Total do dispositivo</Text>
          <Text style={[styles.deviceTotalValue, { color: brandColors.primary }]}>
            {Formatter.formatMoney(deviceTotal)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore store="invoice" />
      <StateStore store="device_config" />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dispositivos</Text>
          <Text style={styles.summaryValue}>{summary.devices}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Carteiras</Text>
          <Text style={styles.summaryValue}>{summary.wallets}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total geral</Text>
          <Text style={[styles.summaryValue, { color: hex.success }]}>{Formatter.formatMoney(summary.total)}</Text>
        </View>
      </View>

      {isLoadingInvoices || isLoadingDevices ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={brandColors.primary} />
          <Text style={styles.loadingText}>Carregando caixas...</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {deviceConfigs?.length ? (
          deviceConfigs.map(renderDevice)
        ) : (
          <View style={styles.emptyMain}>
            <Text style={styles.emptyMainTitle}>Nenhum dispositivo encontrado</Text>
            <Text style={styles.emptyMainSubtitle}>Cadastre dispositivos para visualizar os caixas.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...cardShadow,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  loadingBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 26,
    gap: 10,
  },
  deviceCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    ...cardShadow,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  walletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  walletCard: {
    minWidth: 260,
    flexGrow: 1,
    flexBasis: 300,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  walletName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  paymentLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  paymentValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  walletFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletFooterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  walletFooterValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  deviceTotal: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  deviceTotalValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  emptyDevice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  emptyDeviceText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyMain: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    ...cardShadow,
  },
  emptyMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyMainSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

export default CashRegisters;

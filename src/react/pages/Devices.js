import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  checkNetworkPrinterConnection,
  isNetworkPrinterRuntimeSupported,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  getDeviceTypeLabel,
  getPrinterHost,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
  isPrinterDeviceType,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import styles from './Devices.styles';

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
};
const PDV_DEVICE_TYPE = 'PDV';
const DISPLAY_DEVICE_TYPE = 'DISPLAY';

const getDeviceConfigType = deviceConfig =>
  String(deviceConfig?.type || deviceConfig?.device?.type || '')
    .trim()
    .toUpperCase();

const getStatus = dc => {
  const closed = dc?.configs?.['cash-wallet-closed-id'];
  return closed === 0 || closed === '0' || closed === undefined || closed === null
    ? 'open'
    : 'closed';
};

const getDeviceIcon = type => {
  const normalizedType = String(type || '').trim().toUpperCase();
  if (isPrinterDeviceType(normalizedType)) {
    return 'printer';
  }

  if (normalizedType === PDV_DEVICE_TYPE) {
    return 'shopping-bag';
  }

  if (normalizedType === DISPLAY_DEVICE_TYPE) {
    return 'monitor';
  }

  return 'cpu';
};

const getPrinterConnectivityMeta = status => {
  if (status === 'online') {
    return {label: 'Online', color: hex.success};
  }

  if (status === 'offline') {
    return {label: 'Offline', color: hex.danger};
  }

  if (status === 'checking') {
    return {label: 'Testando', color: hex.primary};
  }

  if (status === 'unsupported') {
    return {label: 'Sem teste', color: hex.warning};
  }

  return {label: 'Rede', color: hex.primary};
};

const Devices = () => {
  const navigation          = useNavigation();
  const peopleStore         = useStore('people');
  const deviceConfigStore   = useStore('device_config');
  const themeStore          = useStore('theme');

  const { currentCompany }                                   = peopleStore.getters;
  const { colors: themeColors }                              = themeStore.getters;
  const { items: deviceConfigs, isLoading }                  = deviceConfigStore.getters;

  const actionsRef = useRef({});
  actionsRef.current = { deviceConfigActions: deviceConfigStore.actions };
  const [printerConnectivityByDevice, setPrinterConnectivityByDevice] =
    useState({});

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const scopedDeviceConfigs = useMemo(
    () =>
      (deviceConfigs || []).filter(dc => {
        const peopleId = String(dc?.people?.id || dc?.people || '').replace(/\D/g, '');
        const companyId = String(currentCompany?.id || '').replace(/\D/g, '');
        return !companyId || peopleId === companyId;
      }),
    [currentCompany?.id, deviceConfigs],
  );

  useEffect(() => {
    if (currentCompany?.id) {
      actionsRef.current.deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
    }
  }, [currentCompany?.id]);

  useFocusEffect(
    useCallback(() => {
      if (currentCompany?.id) {
        actionsRef.current.deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
      }
    }, [currentCompany?.id]),
  );

  useFocusEffect(
    useCallback(() => {
      const printerConfigs = scopedDeviceConfigs.filter(dc =>
        isPrinterDeviceType(getDeviceConfigType(dc)),
      );

      if (printerConfigs.length === 0) {
        setPrinterConnectivityByDevice({});
        return;
      }

      if (!isNetworkPrinterRuntimeSupported) {
        setPrinterConnectivityByDevice(
          printerConfigs.reduce((acc, dc) => {
            const deviceKey = normalizeDeviceId(
              dc?.device?.device || dc?.device?.id || dc?.id,
            );
            if (deviceKey) {
              acc[deviceKey] = {status: 'unsupported'};
            }
            return acc;
          }, {}),
        );
        return;
      }

      let cancelled = false;

      setPrinterConnectivityByDevice(previous => {
        const nextValue = {...previous};

        printerConfigs.forEach(dc => {
          const deviceKey = normalizeDeviceId(
            dc?.device?.device || dc?.device?.id || dc?.id,
          );

          if (deviceKey) {
            nextValue[deviceKey] = {
              ...(nextValue[deviceKey] || {}),
              status: 'checking',
            };
          }
        });

        return nextValue;
      });

      Promise.all(
        printerConfigs.map(async dc => {
          const deviceKey = normalizeDeviceId(
            dc?.device?.device || dc?.device?.id || dc?.id,
          );
          const parsedConfigs = parseConfigsObject(dc?.configs);
          const host = getPrinterHost({
            ...(dc?.device || {}),
            configs: parsedConfigs,
          });
          const port = normalizePrinterPort(
            parsedConfigs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
              DEFAULT_NETWORK_PRINTER_PORT,
          );

          if (!deviceKey || !host) {
            return [
              deviceKey,
              {
                status: 'offline',
                error: 'IP/hostname nao configurado.',
              },
            ];
          }

          try {
            await checkNetworkPrinterConnection({host, port});

            return [
              deviceKey,
              {
                status: 'online',
                host,
                port,
                checkedAt: Date.now(),
              },
            ];
          } catch (error) {
            return [
              deviceKey,
              {
                status: 'offline',
                host,
                port,
                checkedAt: Date.now(),
                error: error?.message || 'Falha ao conectar no socket.',
              },
            ];
          }
        }),
      ).then(results => {
        if (cancelled) {
          return;
        }

        setPrinterConnectivityByDevice(previous => {
          const nextValue = {...previous};

          results.forEach(([deviceKey, statusEntry]) => {
            if (!deviceKey) {
              return;
            }

            nextValue[deviceKey] = statusEntry;
          });

          return nextValue;
        });
      });

      return () => {
        cancelled = true;
      };
    }, [scopedDeviceConfigs]),
  );

  const printerCount = useMemo(
    () =>
      scopedDeviceConfigs.filter(dc =>
        isPrinterDeviceType(getDeviceConfigType(dc)),
      ).length,
    [scopedDeviceConfigs],
  );

  const openCount = useMemo(
    () =>
      scopedDeviceConfigs.filter(
        dc =>
          getDeviceConfigType(dc) === PDV_DEVICE_TYPE &&
          getStatus(dc) === 'open',
      ).length,
    [scopedDeviceConfigs],
  );

  const goToDetail = useCallback(dc => {
    const deviceType = getDeviceConfigType(dc);
    const targetRoute = isPrinterDeviceType(deviceType)
      ? 'PrinterDeviceDetail'
      : 'DeviceDetail';

    navigation.navigate(targetRoute, {
      dcId:         dc.id,
      deviceId:     dc.device?.id,
      deviceString: dc.device?.device,
      deviceType:   deviceType,
      alias:        dc.device?.alias || dc.device?.device || `Dispositivo #${dc.id}`,
      configs:      dc.configs || {},
      metadata:     dc.device?.metadata || {},
    });
  }, [navigation]);

  const renderItem = ({ item: dc }) => {
    const normalizedType = getDeviceConfigType(dc);
    const isPrinter = isPrinterDeviceType(normalizedType);
    const isPdv = normalizedType === PDV_DEVICE_TYPE;
    const isDisplay = normalizedType === DISPLAY_DEVICE_TYPE;
    const isOpen  = getStatus(dc) === 'open';
    const alias   = dc.device?.alias || dc.device?.device || `Dispositivo #${dc.id}`;
    const printerDeviceKey = normalizeDeviceId(
      dc?.device?.device || dc?.device?.id || dc?.id,
    );
    const printerConnectivityMeta = getPrinterConnectivityMeta(
      printerConnectivityByDevice?.[printerDeviceKey]?.status,
    );
    const accent  = isPrinter
      ? printerConnectivityMeta.color
      : isDisplay
        ? hex.primary
        : (isOpen ? hex.success : hex.danger);
    const iconName = getDeviceIcon(normalizedType);
    const badgeText = isPrinter
      ? printerConnectivityMeta.label
      : isDisplay
        ? 'KDS'
        : isPdv
          ? (isOpen ? 'Aberto' : 'Fechado')
          : 'Device';

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        activeOpacity={0.82}
        onPress={() => goToDetail(dc)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: withOpacity(accent, 0.1) }]}>
            <Icon name={iconName} size={18} color={accent} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.deviceTitle} numberOfLines={1}>{alias}</Text>
            <Text style={styles.deviceSub} numberOfLines={1}>
              {`${getDeviceTypeLabel(normalizedType)} • ${dc.device?.device || ''}`}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: withOpacity(accent, 0.12), borderColor: withOpacity(accent, 0.4) }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.badgeText, { color: accent }]}>
              {badgeText}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="#CBD5E1" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore store="device_config" />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dispositivos</Text>
          <Text style={styles.summaryValue}>{scopedDeviceConfigs.length || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Impressoras</Text>
          <Text style={[styles.summaryValue, { color: hex.primary }]}>{printerCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>PDVs abertos</Text>
          <Text style={[styles.summaryValue, { color: hex.success }]}>
            {openCount}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createPrinterBtn, { backgroundColor: brandColors.primary }]}
        activeOpacity={0.86}
        onPress={() => navigation.navigate('PrinterDeviceForm')}
      >
        <Icon name="plus-circle" size={16} color="#fff" />
        <Text style={styles.createPrinterBtnText}>Nova impressora de rede</Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        Cadastre impressoras por IP/hostname e vincule o device local que vai
        gerenciar a impressao na rede.
      </Text>

      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={brandColors.primary} />
          <Text style={styles.loadingText}>Carregando dispositivos...</Text>
        </View>
      )}

      <FlatList
        data={scopedDeviceConfigs || []}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Icon name="monitor" size={32} color="#CBD5E1" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Nenhum dispositivo encontrado</Text>
              <Text style={styles.emptySub}>Cadastre dispositivos para visualizar os equipamentos da empresa.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default Devices;

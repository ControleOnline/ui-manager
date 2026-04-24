import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import {
  getPosOperationModeOption,
  parseConfigsObject,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  checkNetworkPrinterConnection,
  isNetworkPrinterRuntimeSupported,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DISPLAY_DEVICE_TYPE,
  getDeviceConfigType,
  getDeviceTypeLabel,
  getPrinterHost,
  IP_CAMERA_DEVICE_TYPE,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  PDV_DEVICE_TYPE,
  isManagedNetworkDeviceType,
  isPrinterDeviceType,
  normalizeDeviceType,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  getPaymentGateway,
  getPaymentGatewayLabel,
  isPdvPrinterEnabled,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../Devices.styles';

const PAGE_SIZE = 20;
const tt = (type, key) => global.t?.t('configs', type, key);

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
};

const mergeDeviceConfigs = (currentItems = [], nextItems = []) => {
  const currentList = Array.isArray(currentItems) ? currentItems : [];
  const nextList = Array.isArray(nextItems) ? nextItems : [];
  const seenIds = new Set(currentList.map(item => String(item?.id || '')));

  return [
    ...currentList,
    ...nextList.filter(item => {
      const itemId = String(item?.id || '');

      if (!itemId || seenIds.has(itemId)) {
        return false;
      }

      seenIds.add(itemId);
      return true;
    }),
  ];
};

const getStatus = deviceConfig => {
  const configs = parseConfigsObject(deviceConfig?.configs);
  const closed = configs?.['cash-wallet-closed-id'];

  return closed === 0 || closed === '0' || closed === undefined || closed === null
    ? 'open'
    : 'closed';
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

const getDeviceIconName = type => {
  const normalizedType = normalizeDeviceType(type);

  if (isPrinterDeviceType(normalizedType)) {
    return 'printer';
  }

  if (normalizedType === IP_CAMERA_DEVICE_TYPE) {
    return 'camera';
  }

  if (normalizedType === DISPLAY_DEVICE_TYPE) {
    return 'monitor';
  }

  if (normalizedType === PDV_DEVICE_TYPE) {
    return 'shopping-bag';
  }

  return 'cpu';
};

const getDeviceItemTypeLabel = type => {
  const normalizedType = normalizeDeviceType(type);

  if (normalizedType === PDV_DEVICE_TYPE) {
    return 'PDV';
  }

  if (normalizedType === DISPLAY_DEVICE_TYPE) {
    return 'KDS';
  }

  if (normalizedType === 'DEVICE') {
    return 'Device';
  }

  if (normalizedType === IP_CAMERA_DEVICE_TYPE) {
    return 'Camera IP';
  }

  if (isPrinterDeviceType(normalizedType)) {
    return 'Impressora';
  }

  return getDeviceTypeLabel(normalizedType);
};

const getPosOperationModeLabel = configs => {
  const mode = resolvePosOperationMode(configs);
  const option = getPosOperationModeOption(mode);

  return tt('option', option?.translationKey);
};

const getDeviceDetailRoute = type => {
  const normalizedType = normalizeDeviceType(type);

  if (normalizedType === IP_CAMERA_DEVICE_TYPE) {
    return 'IpCameraDetail';
  }

  if (isPrinterDeviceType(normalizedType)) {
    return 'PrinterDeviceDetail';
  }

  return 'DeviceDetail';
};

const buildDeviceListParams = ({
  companyId,
  page,
  pageSize = PAGE_SIZE,
  queryTypes = [],
}) => {
  const params = {
    people: `/people/${companyId}`,
    itemsPerPage: pageSize,
    page,
    'order[id]': 'DESC',
  };

  if (Array.isArray(queryTypes) && queryTypes.length === 1) {
    params.type = queryTypes[0];
  }

  if (Array.isArray(queryTypes) && queryTypes.length > 1) {
    params.type = queryTypes;
  }

  return params;
};

export const createDeviceTypeTab = ({
  label,
  pageSize = PAGE_SIZE,
  queryTypes = [],
  emptyState,
  clientFilter = null,
}) => {
  const DeviceTypeTab = () => {
    const navigation = useNavigation();
    const peopleStore = useStore('people');
    const themeStore = useStore('theme');

    const {currentCompany} = peopleStore.getters;
    const {colors: themeColors} = themeStore.getters;

    const brandColors = useMemo(
      () =>
        resolveThemePalette(
          {...themeColors, ...(currentCompany?.theme?.colors || {})},
          colors,
        ),
      [themeColors, currentCompany?.id],
    );

    const [deviceConfigs, setDeviceConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [lastBatchSize, setLastBatchSize] = useState(0);
    const [error, setError] = useState('');
    const [networkConnectivityByDevice, setNetworkConnectivityByDevice] =
      useState({});

    const fetchingRef = useRef(false);
    const companyId = String(currentCompany?.id || '').trim();

    const hasMore = useMemo(() => {
      if (totalItems > 0) {
        return deviceConfigs.length < totalItems;
      }

      return lastBatchSize === pageSize;
    }, [deviceConfigs.length, lastBatchSize, pageSize, totalItems]);
    const visibleDeviceConfigs = useMemo(() => {
      if (typeof clientFilter !== 'function') {
        return deviceConfigs;
      }

      return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
        deviceConfig => clientFilter(deviceConfig),
      );
    }, [clientFilter, deviceConfigs]);

    const fetchPage = useCallback(
      async (targetPage, mode = 'loading') => {
        if (!companyId || fetchingRef.current) {
          if (!companyId) {
            setDeviceConfigs([]);
            setTotalItems(0);
            setLastBatchSize(0);
            setError('');
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
          }
          return;
        }

        fetchingRef.current = true;

        if (mode === 'loading') {
          setLoading(true);
        }

        if (mode === 'refresh') {
          setRefreshing(true);
        }

        if (mode === 'append') {
          setLoadingMore(true);
        }

        try {
          const response = await api.fetch('/device_configs', {
            params: buildDeviceListParams({
              companyId,
              page: targetPage,
              pageSize,
              queryTypes,
            }),
          });

          const nextItems = Array.isArray(response?.member) ? response.member : [];
          const nextTotalItems = Number(response?.totalItems || 0);

          setDeviceConfigs(currentItems =>
            mode === 'append'
              ? mergeDeviceConfigs(currentItems, nextItems)
              : nextItems,
          );
          setTotalItems(nextTotalItems);
          setLastBatchSize(nextItems.length);
          setError('');
        } catch (fetchError) {
          if (mode !== 'append') {
            setDeviceConfigs([]);
            setTotalItems(0);
            setLastBatchSize(0);
          }

          setError(
            fetchError?.message || 'Nao foi possivel carregar os dispositivos.',
          );
        } finally {
          fetchingRef.current = false;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      },
      [companyId, pageSize, queryTypes],
    );

    useFocusEffect(
      useCallback(() => {
        fetchPage(1, 'loading');
      }, [fetchPage]),
    );

    useEffect(() => {
      const networkDeviceConfigs = deviceConfigs.filter(deviceConfig =>
        isManagedNetworkDeviceType(getDeviceConfigType(deviceConfig)),
      );

      if (networkDeviceConfigs.length === 0) {
        setNetworkConnectivityByDevice({});
        return;
      }

      if (!isNetworkPrinterRuntimeSupported) {
        setNetworkConnectivityByDevice(
          networkDeviceConfigs.reduce((acc, deviceConfig) => {
            const deviceKey = normalizeDeviceId(
              deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
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

      setNetworkConnectivityByDevice(previousState => {
        const nextState = {...previousState};

        networkDeviceConfigs.forEach(deviceConfig => {
          const deviceKey = normalizeDeviceId(
            deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
          );

          if (deviceKey) {
            nextState[deviceKey] = {
              ...(nextState[deviceKey] || {}),
              status: 'checking',
            };
          }
        });

        return nextState;
      });

      Promise.all(
        networkDeviceConfigs.map(async deviceConfig => {
          const deviceKey = normalizeDeviceId(
            deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
          );
          const parsedConfigs = parseConfigsObject(deviceConfig?.configs);
          const host = getPrinterHost({
            ...(deviceConfig?.device || {}),
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
                error: 'IP ou hostname nao configurado.',
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
          } catch (connectError) {
            return [
              deviceKey,
              {
                status: 'offline',
                host,
                port,
                checkedAt: Date.now(),
                error:
                  connectError?.message || 'Falha ao conectar com o equipamento.',
              },
            ];
          }
        }),
      ).then(results => {
        if (cancelled) {
          return;
        }

        setNetworkConnectivityByDevice(previousState => {
          const nextState = {...previousState};

          results.forEach(([deviceKey, statusEntry]) => {
            if (!deviceKey) {
              return;
            }

            nextState[deviceKey] = statusEntry;
          });

          return nextState;
        });
      });

      return () => {
        cancelled = true;
      };
    }, [deviceConfigs]);

    const goToDetail = useCallback(
      deviceConfig => {
        const deviceType = getDeviceConfigType(deviceConfig);

        navigation.navigate(getDeviceDetailRoute(deviceType), {
          dcId: deviceConfig.id,
          deviceId: deviceConfig.device?.id,
          deviceString: deviceConfig.device?.device,
          deviceType,
          alias:
            deviceConfig.device?.alias ||
            deviceConfig.device?.device ||
            `Dispositivo #${deviceConfig.id}`,
          configs: deviceConfig.configs || {},
          metadata: deviceConfig.device?.metadata || {},
        });
      },
      [navigation],
    );

    const handleRefresh = useCallback(() => {
      fetchPage(1, 'refresh');
    }, [fetchPage]);

    const handleLoadMore = useCallback(() => {
      if (loading || refreshing || loadingMore || fetchingRef.current || !hasMore) {
        return;
      }

      fetchPage(Math.floor(deviceConfigs.length / pageSize) + 1, 'append');
    }, [
      deviceConfigs.length,
      fetchPage,
      hasMore,
      loading,
      loadingMore,
      pageSize,
      refreshing,
    ]);

    const renderItem = useCallback(
      ({item: deviceConfig}) => {
        const normalizedType = getDeviceConfigType(deviceConfig);
        const isManagedNetwork = isManagedNetworkDeviceType(normalizedType);
        const isPdv = normalizedType === PDV_DEVICE_TYPE;
        const isDisplay = normalizedType === DISPLAY_DEVICE_TYPE;
        const isOpen = getStatus(deviceConfig) === 'open';
        const pdvGateway = getPaymentGateway(deviceConfig);
        const pdvGatewayLabel = pdvGateway
          ? getPaymentGatewayLabel(pdvGateway)
          : 'Sem gateway';
        const pdvPrinterEnabled = isPdvPrinterEnabled(deviceConfig);
        const posOperationModeLabel = isPdv
          ? getPosOperationModeLabel(deviceConfig?.configs)
          : '';
        const alias =
          deviceConfig.device?.alias ||
          deviceConfig.device?.device ||
          `Dispositivo #${deviceConfig.id}`;
        const deviceKey = normalizeDeviceId(
          deviceConfig?.device?.device || deviceConfig?.device?.id || deviceConfig?.id,
        );
        const printerConnectivityMeta = getPrinterConnectivityMeta(
          networkConnectivityByDevice?.[deviceKey]?.status,
        );
        const accent = isManagedNetwork
          ? printerConnectivityMeta.color
          : isDisplay
            ? hex.primary
            : isOpen
              ? hex.success
              : hex.danger;
        const badgeText = isManagedNetwork
          ? printerConnectivityMeta.label
          : isDisplay
            ? 'KDS'
            : isPdv
              ? isOpen
                ? 'Aberto'
                : 'Fechado'
              : 'Device';

        return (
          <TouchableOpacity
            style={styles.deviceCard}
            activeOpacity={0.82}
            onPress={() => goToDetail(deviceConfig)}>
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconBox,
                  {backgroundColor: withOpacity(accent, 0.1)},
                ]}>
                <Icon
                  name={getDeviceIconName(normalizedType)}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.deviceTitle} numberOfLines={1}>
                  {alias}
                </Text>
                <Text style={styles.deviceSub} numberOfLines={1}>
                  {`${getDeviceItemTypeLabel(normalizedType)} • ${deviceConfig.device?.device || ''}`}
                </Text>
                {isPdv ? (
                  <View style={styles.deviceMetaRow}>
                    <View style={styles.deviceMetaChip}>
                      <Text style={styles.deviceMetaChipText}>
                        {pdvGatewayLabel}
                      </Text>
                    </View>
                    <View style={styles.deviceMetaChip}>
                      <Text style={styles.deviceMetaChipText}>
                        {posOperationModeLabel}
                      </Text>
                    </View>
                    <View style={styles.deviceMetaChip}>
                      <Text style={styles.deviceMetaChipText}>
                        {`Impressora ${pdvPrinterEnabled ? 'Sim' : 'Nao'}`}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.cardRight}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: withOpacity(accent, 0.12),
                    borderColor: withOpacity(accent, 0.4),
                  },
                ]}>
                <View style={[styles.dot, {backgroundColor: accent}]} />
                <Text style={[styles.badgeText, {color: accent}]}>
                  {badgeText}
                </Text>
              </View>
              <Icon
                name="chevron-right"
                size={16}
                color="#CBD5E1"
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>
        );
      },
      [goToDetail, networkConnectivityByDevice],
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.listMetaRow}>
          <Text style={styles.listMetaTitle}>{label}</Text>
          <Text style={styles.listMetaText}>
            {typeof clientFilter === 'function'
              ? `${visibleDeviceConfigs.length} exibido(s)`
              : totalItems > 0
                ? `${deviceConfigs.length} de ${totalItems}`
                : `${deviceConfigs.length} carregado(s)`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Carregando dispositivos...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.inlineMessageBox}>
            <Text style={styles.inlineMessageText}>{error}</Text>
          </View>
        ) : null}

        <FlatList
          style={styles.tabList}
          data={visibleDeviceConfigs}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          contentContainerStyle={[
            styles.listContent,
            visibleDeviceConfigs.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyBox}>
                <Icon
                  name={emptyState.icon}
                  size={32}
                  color="#CBD5E1"
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>{emptyState.title}</Text>
                <Text style={styles.emptySub}>{emptyState.description}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooterLoader}>
                <ActivityIndicator size="small" color={brandColors.primary} />
                <Text style={styles.loadingText}>Carregando mais dispositivos...</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  };

  return DeviceTypeTab;
};

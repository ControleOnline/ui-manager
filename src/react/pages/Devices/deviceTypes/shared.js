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
import {app_type} from '@appType';
import {
  buildProviderManagedDeviceConfigs,
  getPosOperationModeOption,
  isPosCashRegisterOpen,
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
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {getRuntimeFooterDebugInfo} from '@controleonline/ui-common/src/react/utils/runtimeFooter';
import {resolveOperationalDeviceType} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import {
  findDeviceConfigByType,
  getRuntimeDeviceIdentifier,
  groupDeviceConfigs,
  hasCurrentPdvConfig,
  isCurrentDeviceGroup,
  prioritizeCurrentDeviceGroups,
  readStoredRuntimeDevice,
} from '../currentDevice';
import styles from '../../Devices.styles';

const PAGE_SIZE = 20;
const API_PAGE_SIZE = 200;
const tt = (type, key) => global.t?.t('configs', type, key);

const hex = {
  primary: '#0EA5E9',
  success: '#10b981',
  danger: '#c10015',
  warning: '#e67e22',
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

const isPosDeviceOpen = deviceConfig => {
  const configs = parseConfigsObject(deviceConfig?.configs);
  return isPosCashRegisterOpen(configs);
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

const getDeviceBadgeLabel = (type, deviceConfig) => {
  const normalizedType = normalizeDeviceType(type);

  if (normalizedType === PDV_DEVICE_TYPE) {
    const gateway = getPaymentGateway(deviceConfig);
    return gateway
      ? `PDV · ${getPaymentGatewayLabel(gateway)}`
      : 'PDV';
  }

  return getDeviceItemTypeLabel(normalizedType);
};

const getDeviceTypeAccent = type => {
  const normalizedType = normalizeDeviceType(type);

  if (!normalizedType || normalizedType === 'DEVICE') {
    return hex.warning;
  }

  return hex.primary;
};

const getPosStatusLabel = deviceConfig =>
  isPosDeviceOpen(deviceConfig)
    ? global.t?.t('orders', 'status', 'open') || 'Aberto'
    : global.t?.t('orders', 'status', 'closed') || 'Fechado';

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

const getDeviceListIdentifier = deviceConfig =>
  getRuntimeFooterDebugInfo({
    device: deviceConfig?.device || {},
    deviceConfig,
  }).runtimeDetail || String(deviceConfig?.device?.device || '').trim();

const buildDeviceListParams = ({
  companyId,
  page,
  pageSize = PAGE_SIZE,
  queryTypes = [],
}) => {
  const params = {
    people: `/people/${companyId}`,
    page,
    itemsPerPage: pageSize,
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
  offerCurrentPdvSetup = false,
}) => {
  const DeviceTypeTab = () => {
    const navigation = useNavigation();
    const peopleStore = useStore('people');
    const deviceStore = useStore('device');
    const deviceConfigStore = useStore('device_config');
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
    const [error, setError] = useState('');
    const [creatingPdv, setCreatingPdv] = useState(false);
    const [runtimeDevice, setRuntimeDevice] = useState(() =>
      readStoredRuntimeDevice(),
    );
    const [networkConnectivityByDevice, setNetworkConnectivityByDevice] =
      useState({});

    const fetchingRef = useRef(false);
    const companyId = String(currentCompany?.id || '').trim();
    const runtimeDeviceIdentifier =
      getRuntimeDeviceIdentifier(runtimeDevice);
    const runtimeDeviceType = normalizeDeviceType(
      resolveOperationalDeviceType({
        appType: app_type,
        deviceInfo: runtimeDevice,
      }),
    );
    const filteredDeviceConfigs = useMemo(() => {
      if (typeof clientFilter !== 'function') {
        return deviceConfigs;
      }

      return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
        deviceConfig => clientFilter(deviceConfig),
      );
    }, [clientFilter, deviceConfigs]);
    const visibleDeviceGroups = useMemo(
      () =>
        prioritizeCurrentDeviceGroups(
          groupDeviceConfigs(filteredDeviceConfigs, {
            includeRuntimeDevice: offerCurrentPdvSetup,
            runtimeDevice,
          }),
          runtimeDeviceIdentifier,
        ),
      [
        filteredDeviceConfigs,
        offerCurrentPdvSetup,
        runtimeDevice,
        runtimeDeviceIdentifier,
      ],
    );
    const currentDeviceGroup = useMemo(
      () =>
        visibleDeviceGroups.find(deviceGroup =>
          isCurrentDeviceGroup({
            deviceGroup,
            runtimeDeviceIdentifier,
          }),
        ) || null,
      [runtimeDeviceIdentifier, visibleDeviceGroups],
    );
    const currentDeviceConfigs = currentDeviceGroup?.deviceConfigs || [];

    const fetchDeviceConfigs = useCallback(
      async (mode = 'loading') => {
        if (!companyId || fetchingRef.current) {
          if (!companyId) {
            setDeviceConfigs([]);
            setError('');
            setLoading(false);
            setRefreshing(false);
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

        try {
          const requestPageSize = Math.max(pageSize, API_PAGE_SIZE);
          let page = 1;
          let loadedItems = [];
          let reportedTotal = 0;

          while (true) {
            const pageItems = await deviceConfigStore.actions.getItems(
              buildDeviceListParams({
                companyId,
                page,
                pageSize: requestPageSize,
                queryTypes,
              }),
            );
            const previousLength = loadedItems.length;
            loadedItems = mergeDeviceConfigs(loadedItems, pageItems);
            reportedTotal = Math.max(
              reportedTotal,
              Number(
                deviceConfigStore.getters.totalItems ||
                  loadedItems.length ||
                  0,
              ),
            );

            if (
              !Array.isArray(pageItems) ||
              pageItems.length === 0 ||
              loadedItems.length >= reportedTotal ||
              loadedItems.length === previousLength
            ) {
              break;
            }

            page += 1;
          }

          setDeviceConfigs(loadedItems);
          setError('');
        } catch (fetchError) {
          setDeviceConfigs([]);

          setError(
            fetchError?.message || 'Nao foi possivel carregar os dispositivos.',
          );
        } finally {
          fetchingRef.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        companyId,
        deviceConfigStore.actions,
        deviceConfigStore.getters,
        pageSize,
        queryTypes,
      ],
    );

    useFocusEffect(
      useCallback(() => {
        setRuntimeDevice(readStoredRuntimeDevice());
        fetchDeviceConfigs('loading');
      }, [fetchDeviceConfigs]),
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
        const nextDevice = deviceConfig?.device || {};
        const nextDeviceId = normalizeEntityId(nextDevice?.id || nextDevice?.['@id']);
        const nextConfigs = parseConfigsObject(deviceConfig?.configs);

        deviceStore.actions.setItem(nextDevice);
        deviceConfigStore.actions.setItem({
          ...deviceConfig,
          configs: nextConfigs,
        });

        navigation.navigate(getDeviceDetailRoute(deviceType), {
          deviceId: nextDeviceId,
        });
      },
      [deviceConfigStore.actions, deviceStore.actions, navigation],
    );

    const currentPdvExists = useMemo(
      () =>
        hasCurrentPdvConfig(
          currentDeviceConfigs,
          runtimeDeviceIdentifier,
        ),
      [currentDeviceConfigs, runtimeDeviceIdentifier],
    );
    const showCurrentPdvSetup = Boolean(
      offerCurrentPdvSetup &&
        !loading &&
        runtimeDeviceIdentifier &&
        !currentPdvExists,
    );

    const handleCreateCurrentPdv = useCallback(async () => {
      if (
        creatingPdv ||
        !companyId ||
        !runtimeDeviceIdentifier ||
        currentPdvExists
      ) {
        return;
      }

      setCreatingPdv(true);
      setError('');

      try {
        const {nextConfigs} = buildProviderManagedDeviceConfigs({
          configs: {},
          appVersion: runtimeDevice?.appVersion,
          deviceInfo: runtimeDevice,
        });
        const savedDeviceConfig =
          await deviceConfigStore.actions.addDeviceConfigs({
            device: runtimeDeviceIdentifier,
            people: `/people/${companyId}`,
            type: PDV_DEVICE_TYPE,
            configs: JSON.stringify(nextConfigs),
          });

        await fetchDeviceConfigs('refresh');

        if (savedDeviceConfig?.id && savedDeviceConfig?.device) {
          goToDetail(savedDeviceConfig);
        }
      } catch (createError) {
        setError(
          createError?.message ||
            'Nao foi possivel configurar este dispositivo como PDV.',
        );
      } finally {
        setCreatingPdv(false);
      }
    }, [
      companyId,
      creatingPdv,
      currentPdvExists,
      deviceConfigStore.actions,
      fetchDeviceConfigs,
      goToDetail,
      runtimeDevice,
      runtimeDeviceIdentifier,
    ]);

    const handleRefresh = useCallback(() => {
      fetchDeviceConfigs('refresh');
    }, [fetchDeviceConfigs]);

    const renderItem = useCallback(
      ({item: deviceGroup}) => {
        const isCurrentDevice = isCurrentDeviceGroup({
          deviceGroup,
          runtimeDeviceIdentifier,
        });
        const sessionConfig = isCurrentDevice
          ? findDeviceConfigByType(deviceGroup, runtimeDeviceType)
          : null;
        const filteredTypeConfig =
          queryTypes.length === 1
            ? findDeviceConfigByType(deviceGroup, queryTypes[0])
            : null;
        const primaryConfig =
          sessionConfig ||
          filteredTypeConfig ||
          deviceGroup.deviceConfigs[0] ||
          null;
        const normalizedType = primaryConfig
          ? getDeviceConfigType(primaryConfig)
          : runtimeDeviceType || 'DEVICE';
        const isManagedNetwork =
          primaryConfig && isManagedNetworkDeviceType(normalizedType);
        const isPdv = normalizedType === PDV_DEVICE_TYPE;
        const alias =
          deviceGroup.device?.alias ||
          deviceGroup.device?.device ||
          'Dispositivo';
        const deviceIdentifier = primaryConfig
          ? getDeviceListIdentifier(primaryConfig)
          : String(deviceGroup.device?.device || runtimeDeviceIdentifier).trim();
        const deviceKey = normalizeDeviceId(
          deviceGroup.device?.device ||
            deviceGroup.device?.id ||
            deviceGroup.key,
        );
        const accent = getDeviceTypeAccent(normalizedType);
        const metaChips = [];

        if (isPdv && primaryConfig) {
          const posOperationModeLabel = getPosOperationModeLabel(
            primaryConfig?.configs,
          );

          if (posOperationModeLabel) {
            metaChips.push(posOperationModeLabel);
          }

          metaChips.push(
            `Impressora ${isPdvPrinterEnabled(primaryConfig) ? 'Sim' : 'Nao'}`,
          );
          metaChips.push(getPosStatusLabel(primaryConfig));
        }

        if (isManagedNetwork) {
          metaChips.push(
            getPrinterConnectivityMeta(
              networkConnectivityByDevice?.[deviceKey]?.status,
            ).label,
          );
        }

        return (
          <View
            testID={`device-group-${deviceGroup.key}`}
            accessibilityLabel={
              isCurrentDevice
                ? `${alias}, ${tt('device_label', 'currentDevice') || 'Este dispositivo'}`
                : alias
            }
            style={[
              styles.deviceCard,
              isCurrentDevice && styles.deviceCardCurrent,
            ]}>
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
                {isCurrentDevice ? (
                  <View
                    testID="current-device-badge"
                    style={styles.currentDeviceBadge}>
                    <Icon
                      name="crosshair"
                      size={11}
                      color={
                        brandColors.badgeSelectedText ||
                        brandColors.cardSelectedText ||
                        brandColors.primary
                      }
                    />
                    <Text style={styles.currentDeviceBadgeText}>
                      {tt('device_label', 'currentDevice') ||
                        'Este dispositivo'}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.deviceTitle} numberOfLines={1}>
                  {alias}
                </Text>
                <Text style={styles.deviceSub} numberOfLines={1}>
                  {deviceIdentifier}
                </Text>

                <View style={styles.deviceConfigRow}>
                  {deviceGroup.deviceConfigs.map(deviceConfig => {
                    const configType = getDeviceConfigType(deviceConfig);
                    const configAccent = getDeviceTypeAccent(configType);
                    const isSessionConfig =
                      isCurrentDevice &&
                      runtimeDeviceType &&
                      configType === runtimeDeviceType;

                    return (
                      <TouchableOpacity
                        key={String(deviceConfig.id)}
                        testID={`device-config-${deviceConfig.id}`}
                        dataSet={{
                          sessionConfig: isSessionConfig ? 'true' : 'false',
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${getDeviceItemTypeLabel(configType)}${
                          isSessionConfig ? ', Em uso nesta sessao' : ''
                        }`}
                        activeOpacity={0.82}
                        style={[
                          styles.deviceConfigChip,
                          {
                            backgroundColor: withOpacity(configAccent, 0.1),
                            borderColor: withOpacity(configAccent, 0.45),
                          },
                          isSessionConfig && styles.deviceConfigChipActive,
                        ]}
                        onPress={() => goToDetail(deviceConfig)}>
                        <View
                          style={[
                            styles.dot,
                            {backgroundColor: configAccent},
                          ]}
                        />
                        <Text
                          style={[
                            styles.deviceConfigChipText,
                            {color: configAccent},
                          ]}>
                          {getDeviceBadgeLabel(configType, deviceConfig)}
                        </Text>
                        {isSessionConfig ? (
                          <Text style={styles.deviceConfigChipActiveText}>
                            {tt('device_label', 'inUse') || 'Em uso'}
                          </Text>
                        ) : null}
                        <Icon
                          name="chevron-right"
                          size={13}
                          color={configAccent}
                        />
                      </TouchableOpacity>
                    );
                  })}

                  {isCurrentDevice && showCurrentPdvSetup ? (
                    <TouchableOpacity
                      testID="configure-current-device-pdv"
                      accessibilityRole="button"
                      accessibilityLabel={
                        tt('device_action', 'configureCurrentAsPdv') ||
                        'Configurar este dispositivo como PDV'
                      }
                      activeOpacity={0.82}
                      disabled={creatingPdv}
                      style={[
                        styles.deviceConfigCreateChip,
                        creatingPdv &&
                          styles.currentPdvSetupButtonDisabled,
                      ]}
                      onPress={handleCreateCurrentPdv}>
                      <Icon
                        name="plus-circle"
                        size={15}
                        color={brandColors.buttonText || brandColors.white}
                      />
                      <Text style={styles.deviceConfigCreateChipText}>
                        {creatingPdv
                          ? tt('device_action', 'configuringPdv') ||
                            'Configurando...'
                          : tt('device_action', 'configureAsPdv') ||
                            'Configurar como PDV'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {metaChips.length > 0 ? (
                  <View style={styles.deviceMetaRow}>
                    {metaChips.map(chipLabel => (
                      <View key={chipLabel} style={styles.deviceMetaChip}>
                        <Text style={styles.deviceMetaChipText}>
                          {chipLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      },
      [
        brandColors.badgeSelectedText,
        brandColors.buttonText,
        brandColors.cardSelectedText,
        brandColors.primary,
        brandColors.white,
        creatingPdv,
        goToDetail,
        handleCreateCurrentPdv,
        networkConnectivityByDevice,
        queryTypes,
        runtimeDeviceIdentifier,
        runtimeDeviceType,
        showCurrentPdvSetup,
      ],
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.listMetaRow}>
          <Text style={styles.listMetaTitle}>{label}</Text>
          <Text style={styles.listMetaText}>
            {`${visibleDeviceGroups.length} dispositivo(s) • ${
              filteredDeviceConfigs.length
            } configuracao(oes)`}
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
          data={visibleDeviceGroups}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={[
            styles.listContent,
            visibleDeviceGroups.length === 0 && styles.listContentEmpty,
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
        />
      </View>
    );
  };

  return DeviceTypeTab;
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.

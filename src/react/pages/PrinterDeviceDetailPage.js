import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {getNetworkDeviceProfile} from '@controleonline/ui-common/src/react/utils/networkDeviceProfiles';
import {
  buildNetworkCameraConfigs,
  buildNetworkCameraMetadata,
  DEFAULT_NETWORK_CAMERA_PROTOCOL,
  getCameraMetadataField,
  getNetworkCameraConfigValues,
  NETWORK_CAMERA_PORT_CONFIG_KEY,
  NETWORK_CAMERA_PROTOCOL_OPTIONS,
} from '@controleonline/ui-common/src/react/utils/networkCameraDevices';
import {
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  checkNetworkPrinterConnection,
  isNetworkPrinterRuntimeSupported,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  buildNetworkPrinterMetadata,
  DEFAULT_NETWORK_PRINTER_COLUMNS,
  DEFAULT_NETWORK_PRINTER_PORT,
  DEFAULT_NETWORK_PRINTER_TRANSPORT,
  getDeviceTypeLabel,
  getPrinterManagerDeviceOptions,
  getPrinterMetadataField,
  IP_CAMERA_DEVICE_TYPE,
  NETWORK_PRINTER_COLUMNS_CONFIG_KEY,
  NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  NETWORK_PRINTER_TRANSPORT_CONFIG_KEY,
  normalizePrinterColumns,
  normalizePrinterHost,
  normalizePrinterPort,
  PRINT_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import styles from './PrinterDeviceDetailPage.styles';

const resolveErrorMessage = error =>
  error?.response?.data?.['hydra:description'] ||
  error?.response?.data?.message ||
  error?.message ||
  'Nao foi possivel salvar as alteracoes.';

const getConnectionStatusMeta = status => {
  if (status === 'online') {
    return {
      label: 'Online',
      color: '#22C55E',
      icon: 'wifi',
    };
  }

  if (status === 'offline') {
    return {
      label: 'Offline',
      color: '#EF4444',
      icon: 'wifi-off',
    };
  }

  if (status === 'checking') {
    return {
      label: 'Testando',
      color: '#0EA5E9',
      icon: 'loader',
    };
  }

  if (status === 'unsupported') {
    return {
      label: 'Sem teste',
      color: '#F59E0B',
      icon: 'slash',
    };
  }

  return {
    label: 'Pendente',
    color: '#64748B',
    icon: 'clock',
  };
};

const PrinterDeviceDetailPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    dcId: initialDeviceConfigId,
    deviceId,
    deviceString,
    deviceType: initialDeviceType,
    alias: initialAlias,
    configs: initialConfigs,
    metadata: initialMetadata,
  } = route.params || {};
  const normalizedDeviceType =
    String(initialDeviceType || '').trim().toUpperCase() || PRINT_DEVICE_TYPE;
  const isIpCamera = normalizedDeviceType === IP_CAMERA_DEVICE_TYPE;
  const deviceProfile = useMemo(
    () => getNetworkDeviceProfile(normalizedDeviceType),
    [normalizedDeviceType],
  );

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

  const initialParsedConfigs = useMemo(
    () => parseConfigsObject(initialConfigs),
    [initialConfigs],
  );
  const initialCameraConfigValues = useMemo(
    () => getNetworkCameraConfigValues(initialParsedConfigs),
    [initialParsedConfigs],
  );
  const persistedDeviceHost = normalizePrinterHost(deviceString);

  const [loading, setLoading] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [removingConfig, setRemovingConfig] = useState(false);
  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [deviceConfigId, setDeviceConfigId] = useState(
    String(initialDeviceConfigId || '').trim(),
  );
  const [deviceMetadata, setDeviceMetadata] = useState(initialMetadata || {});
  const [alias, setAlias] = useState(initialAlias || '');
  const [deviceHost, setDeviceHost] = useState(persistedDeviceHost);
  const [connectionStatus, setConnectionStatus] = useState(
    isNetworkPrinterRuntimeSupported ? 'idle' : 'unsupported',
  );
  const [connectionMessage, setConnectionMessage] = useState(
    isNetworkPrinterRuntimeSupported
      ? `Aguardando teste do socket da ${deviceProfile.itemLabel.toLowerCase()}.`
      : 'Teste de socket disponivel apenas no app nativo.',
  );
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [manufacturer, setManufacturer] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'manufacturer')
      : getPrinterMetadataField(initialMetadata, 'manufacturer'),
  );
  const [model, setModel] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'model')
      : getPrinterMetadataField(initialMetadata, 'model'),
  );
  const [version, setVersion] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'version')
      : getPrinterMetadataField(initialMetadata, 'version'),
  );
  const [port, setPort] = useState(
    isIpCamera
      ? initialCameraConfigValues.port
      : normalizePrinterPort(
          initialParsedConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
            DEFAULT_NETWORK_PRINTER_PORT,
        ),
  );
  const [columns, setColumns] = useState(
    normalizePrinterColumns(
      initialParsedConfigs[NETWORK_PRINTER_COLUMNS_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_COLUMNS,
    ),
  );
  const [managerDeviceId, setManagerDeviceId] = useState(
    isIpCamera
      ? initialCameraConfigValues.managerDeviceId
      : normalizeDeviceId(
          initialParsedConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
        ),
  );
  const [transport, setTransport] = useState(
    String(
      initialParsedConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_TRANSPORT,
    ),
  );
  const [protocol, setProtocol] = useState(initialCameraConfigValues.protocol);
  const [streamPath, setStreamPath] = useState(
    initialCameraConfigValues.streamPath,
  );
  const [username, setUsername] = useState(initialCameraConfigValues.username);
  const [password, setPassword] = useState(initialCameraConfigValues.password);
  const [deviceRuntimeDebugInfoEnabled, setDeviceRuntimeDebugInfoEnabled] =
    useState(
      isTruthyValue(
        initialParsedConfigs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
      ),
    );

  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const scopedDeviceConfigs = useMemo(
    () => filterDeviceConfigsByCompany(companyDeviceConfigs, currentCompany?.id),
    [companyDeviceConfigs, currentCompany?.id],
  );
  const managerDeviceOptions = useMemo(
    () =>
      getPrinterManagerDeviceOptions({
        deviceConfigs: scopedDeviceConfigs,
        companyId: currentCompany?.id,
        excludeDeviceId: deviceHost || persistedDeviceHost,
      }),
    [currentCompany?.id, deviceHost, persistedDeviceHost, scopedDeviceConfigs],
  );
  const connectionStatusMeta = useMemo(
    () => getConnectionStatusMeta(connectionStatus),
    [connectionStatus],
  );

  const runConnectionCheck = useCallback(
    async ({hostOverride = null, portOverride = null} = {}) => {
      const normalizedHost = normalizePrinterHost(
        hostOverride ?? deviceHost ?? persistedDeviceHost,
      );
      const normalizedPort = normalizePrinterPort(
        portOverride ?? port ?? DEFAULT_NETWORK_PRINTER_PORT,
      );

      if (!isNetworkPrinterRuntimeSupported) {
        setConnectionStatus('unsupported');
        setConnectionMessage(
          'Teste de socket disponivel apenas no app nativo.',
        );
        return false;
      }

      if (!normalizedHost) {
        setConnectionStatus('offline');
        setConnectionMessage('IP ou hostname nao configurado.');
        return false;
      }

      setCheckingConnection(true);
      setConnectionStatus('checking');
      setConnectionMessage(
        `Testando socket ${normalizedHost}:${normalizedPort}...`,
      );

      try {
        await checkNetworkPrinterConnection({
          host: normalizedHost,
          port: normalizedPort,
        });

        setConnectionStatus('online');
        setConnectionMessage(
          `Socket conectado em ${normalizedHost}:${normalizedPort}.`,
        );
        return true;
      } catch (error) {
        setConnectionStatus('offline');
        setConnectionMessage(
          error?.message ||
            `Falha ao conectar em ${normalizedHost}:${normalizedPort}.`,
        );
        return false;
      } finally {
        setCheckingConnection(false);
      }
    },
    [deviceHost, persistedDeviceHost, port],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || !deviceId) {
        return;
      }

      let cancelled = false;
      setLoading(true);

      Promise.all([
        deviceStore.actions.get(deviceId).catch(() => null),
        deviceConfigStore.actions
          .getItems({people: `/people/${currentCompany.id}`})
          .catch(() => []),
      ])
        .then(([deviceData, configs]) => {
          if (cancelled) {
            return;
          }

          const scopedConfigs = filterDeviceConfigsByCompany(
            configs,
            currentCompany?.id,
          );
          setCompanyDeviceConfigs(scopedConfigs);

          const normalizedDeviceKey = String(deviceId || '').trim();
          const currentDeviceConfig = scopedConfigs.find(deviceConfig => {
            const currentDeviceId = String(deviceConfig?.device?.id || '').trim();
            const currentDeviceString = normalizeDeviceId(
              deviceConfig?.device?.device,
            );
            const currentDeviceType = String(
              deviceConfig?.type || deviceConfig?.device?.type || '',
            )
              .trim()
              .toUpperCase();

            return (
              currentDeviceType === normalizedDeviceType &&
              (
                (normalizedDeviceKey !== '' &&
                  currentDeviceId === normalizedDeviceKey) ||
                currentDeviceString === normalizeDeviceId(persistedDeviceHost)
              )
            );
          });
          const nextConfigs = parseConfigsObject(currentDeviceConfig?.configs);
          const nextCameraConfigValues =
            getNetworkCameraConfigValues(nextConfigs);
          const nextMetadata =
            deviceData?.metadata ||
            currentDeviceConfig?.device?.metadata ||
            initialMetadata;
          const nextDeviceHost = normalizePrinterHost(
            deviceData?.device || currentDeviceConfig?.device?.device || deviceString,
          );

          setDeviceConfigId(
            String(currentDeviceConfig?.id || initialDeviceConfigId || '').trim(),
          );
          setDeviceMetadata(nextMetadata || {});
          setAlias(
            deviceData?.alias ||
              currentDeviceConfig?.device?.alias ||
              initialAlias ||
              '',
          );
          setDeviceHost(nextDeviceHost);
          setManufacturer(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'manufacturer')
              : getPrinterMetadataField(nextMetadata, 'manufacturer'),
          );
          setModel(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'model')
              : getPrinterMetadataField(nextMetadata, 'model'),
          );
          setVersion(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'version')
              : getPrinterMetadataField(nextMetadata, 'version'),
          );
          setPort(
            isIpCamera
              ? nextCameraConfigValues.port
              : normalizePrinterPort(
                  nextConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
                    DEFAULT_NETWORK_PRINTER_PORT,
                ),
          );
          setColumns(
            normalizePrinterColumns(
              nextConfigs[NETWORK_PRINTER_COLUMNS_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_COLUMNS,
            ),
          );
          setManagerDeviceId(
            isIpCamera
              ? nextCameraConfigValues.managerDeviceId
              : normalizeDeviceId(
                  nextConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
                ),
          );
          setTransport(
            String(
              nextConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_TRANSPORT,
            ),
          );
          setProtocol(nextCameraConfigValues.protocol);
          setStreamPath(nextCameraConfigValues.streamPath);
          setUsername(nextCameraConfigValues.username);
          setPassword(nextCameraConfigValues.password);
          setDeviceRuntimeDebugInfoEnabled(
            isTruthyValue(
              nextConfigs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
            ),
          );
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      currentCompany?.id,
      deviceConfigStore.actions,
      deviceId,
      deviceStore.actions,
      deviceString,
      initialAlias,
      initialDeviceConfigId,
      initialMetadata,
      isIpCamera,
      persistedDeviceHost,
    ]),
  );

  useFocusEffect(
    useCallback(() => {
      runConnectionCheck();
    }, [runConnectionCheck]),
  );

  const saveDeviceRegistration = useCallback(async () => {
    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        deviceProfile.registrationAlertTitle,
        deviceProfile.hostMissingMessage,
      );
      return;
    }

    const normalizedAlias = String(alias || '').trim() || normalizedHost;
    const metadata = isIpCamera
      ? buildNetworkCameraMetadata({
          existingMetadata: deviceMetadata,
          host: normalizedHost,
          manufacturer,
          model,
          version,
        })
      : buildNetworkPrinterMetadata({
          existingMetadata: deviceMetadata,
          host: normalizedHost,
          manufacturer,
          model,
          version,
          transport,
        });

    setSavingDevice(true);

    try {
      const savedDevice = await deviceStore.actions.save({
        id: deviceId,
        alias: normalizedAlias,
        device: normalizedHost,
        metadata,
      });
      const nextDeviceHost = normalizePrinterHost(
        savedDevice?.device || normalizedHost,
      );

      setAlias(savedDevice?.alias || normalizedAlias);
      setDeviceHost(nextDeviceHost);
      setDeviceMetadata(savedDevice?.metadata || metadata);
      navigation.setParams({
        deviceString: nextDeviceHost,
        alias: savedDevice?.alias || normalizedAlias,
        metadata: savedDevice?.metadata || metadata,
      });
      runConnectionCheck({
        hostOverride: nextDeviceHost,
        portOverride: port,
      });
    } catch (error) {
      Alert.alert(
        deviceProfile.registrationAlertTitle,
        resolveErrorMessage(error),
      );
    } finally {
      setSavingDevice(false);
    }
  }, [
    alias,
    deviceHost,
    deviceMetadata,
    deviceId,
    deviceStore.actions,
    manufacturer,
    model,
    navigation,
    isIpCamera,
    transport,
    version,
    port,
    runConnectionCheck,
    deviceProfile,
  ]);

  const saveRuntimeDebugInfoConfig = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        'Selecione uma empresa antes de salvar as configuracoes.',
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        'Rodape do sistema',
        deviceProfile.hostMissingBeforeSaveMessage,
      );
      return;
    }

    setSavingRuntimeDebugInfo(true);

    try {
      const savedDeviceConfig = await deviceConfigStore.actions.addDeviceConfigs({
        device: normalizedHost,
        people: `/people/${currentCompany.id}`,
        type: normalizedDeviceType,
        configs: JSON.stringify({
          [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]:
            deviceRuntimeDebugInfoEnabled ? '1' : '0',
        }),
      });

      setDeviceConfigId(String(savedDeviceConfig?.id || deviceConfigId || '').trim());
      navigation.setParams({
        dcId: savedDeviceConfig?.id || deviceConfigId,
        deviceString: normalizedHost,
      });
    } catch (error) {
      Alert.alert('Rodape do sistema', resolveErrorMessage(error));
    } finally {
      setSavingRuntimeDebugInfo(false);
    }
  }, [
    currentCompany?.id,
    deviceConfigStore.actions,
    deviceConfigId,
    deviceHost,
    deviceRuntimeDebugInfoEnabled,
    navigation,
    deviceProfile,
  ]);

  const savePrinterConfig = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        'Selecione uma empresa antes de salvar as configuracoes.',
      );
      return;
    }

    if (!managerDeviceId) {
      Alert.alert(
        'Device responsavel',
        deviceProfile.managerRoutingMessage,
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        deviceProfile.hostMissingMessage,
      );
      return;
    }

    if (normalizedHost !== persistedDeviceHost) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        deviceProfile.saveBeforeRoutingMessage,
      );
      return;
    }

    const nextConfigs = isIpCamera
      ? buildNetworkCameraConfigs({
          managerDeviceId,
          port,
          protocol,
          streamPath,
          username,
          password,
        })
      : {
          [NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]: managerDeviceId,
          [NETWORK_PRINTER_PORT_CONFIG_KEY]: normalizePrinterPort(port),
          [NETWORK_PRINTER_COLUMNS_CONFIG_KEY]: normalizePrinterColumns(columns),
          [NETWORK_PRINTER_TRANSPORT_CONFIG_KEY]:
            String(transport || '').trim() || DEFAULT_NETWORK_PRINTER_TRANSPORT,
        };

    setSavingConfig(true);

    try {
      const savedDeviceConfig = await deviceConfigStore.actions.addDeviceConfigs({
        device: normalizedHost,
        people: `/people/${currentCompany.id}`,
        type: normalizedDeviceType,
        configs: JSON.stringify(nextConfigs),
      });

      setDeviceConfigId(String(savedDeviceConfig?.id || deviceConfigId || '').trim());
      navigation.setParams({
        configs: nextConfigs,
        dcId: savedDeviceConfig?.id || deviceConfigId,
        deviceString: normalizedHost,
      });
      runConnectionCheck({
        hostOverride: normalizedHost,
        portOverride: isIpCamera
          ? nextConfigs[NETWORK_CAMERA_PORT_CONFIG_KEY]
          : nextConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY],
      });
    } catch (error) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        resolveErrorMessage(error),
      );
    } finally {
      setSavingConfig(false);
    }
  }, [
    columns,
    currentCompany?.id,
    deviceHost,
    deviceConfigStore.actions,
    deviceConfigId,
    isIpCamera,
    managerDeviceId,
    navigation,
    password,
    port,
    persistedDeviceHost,
    protocol,
    streamPath,
    transport,
    runConnectionCheck,
    username,
    deviceProfile,
  ]);

  const handleRemoveConfig = useCallback(() => {
    const normalizedCurrentConfigId = String(deviceConfigId || '').trim();
    if (!normalizedCurrentConfigId || removingConfig) {
      return;
    }

    Alert.alert(
      deviceProfile.removeConfirmTitle,
      deviceProfile.removeConfirmMessage,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setRemovingConfig(true);

            try {
              await deviceConfigStore.actions.remove(normalizedCurrentConfigId);
              setDeviceConfigId('');
              navigation.navigate('DevicesIndex');
            } catch (error) {
              Alert.alert(
                deviceProfile.removeConfirmTitle,
                error?.message || deviceProfile.removeErrorMessage,
              );
            } finally {
              setRemovingConfig(false);
            }
          },
        },
      ],
    );
  }, [
    deviceConfigId,
    deviceConfigStore.actions,
    deviceProfile,
    navigation,
    removingConfig,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}>
      <StateStore stores={['device', 'device_config', 'people']} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View
            style={[
              styles.heroIcon,
              {backgroundColor: withOpacity(brandColors.primary, 0.12)},
            ]}>
            <Icon name={deviceProfile.icon} size={20} color={brandColors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {alias || deviceProfile.detailHeroFallback}
            </Text>
            <Text style={styles.heroText}>
              {getDeviceTypeLabel(normalizedDeviceType)} vinculada ao endereco{' '}
              {deviceHost || persistedDeviceHost}
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>{deviceProfile.detailLoadingText}</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status do socket</Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.statusSectionDescription}
          </Text>

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: withOpacity(connectionStatusMeta.color, 0.08),
                borderColor: withOpacity(connectionStatusMeta.color, 0.28),
              },
            ]}>
            <View style={styles.statusCopy}>
              <View style={styles.statusTitleRow}>
                <Icon
                  name={connectionStatusMeta.icon}
                  size={15}
                  color={connectionStatusMeta.color}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    {color: connectionStatusMeta.color},
                  ]}>
                  {connectionStatusMeta.label}
                </Text>
              </View>
              <Text style={styles.statusDescription}>{connectionMessage}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                checkingConnection && styles.secondaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={checkingConnection}
              onPress={() => runConnectionCheck()}>
              {checkingConnection ? (
                <ActivityIndicator size="small" color={connectionStatusMeta.color} />
              ) : (
                <>
                  <Icon
                    name="refresh-cw"
                    size={14}
                    color={connectionStatusMeta.color}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {color: connectionStatusMeta.color},
                    ]}>
                    Testar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {deviceProfile.registrationSectionTitle}
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome exibido</Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder={deviceProfile.detailAliasPlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>IP ou hostname</Text>
            <TextInput
              style={styles.input}
              value={deviceHost}
              onChangeText={setDeviceHost}
              placeholder="192.168.0.120"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Fabricante</Text>
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Fabricante"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="Modelo"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Versao/Firmware</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="Versao"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingDevice && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingDevice}
            onPress={saveDeviceRegistration}>
            {savingDevice ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>Salvar cadastro</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {deviceProfile.routingSectionTitle}
          </Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.routingSectionDescription}
          </Text>

          <View style={styles.inlineFields}>
            <View style={[styles.fieldBlock, styles.inlineField]}>
              <Text style={styles.fieldLabel}>
                {isIpCamera ? 'Porta' : 'Porta TCP'}
              </Text>
              <TextInput
                style={styles.input}
                value={port}
                onChangeText={setPort}
                placeholder={
                  isIpCamera ? '554' : DEFAULT_NETWORK_PRINTER_PORT
                }
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>

            {isIpCamera ? (
              <View style={[styles.fieldBlock, styles.inlineField]}>
                <Text style={styles.fieldLabel}>Protocolo</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={protocol || DEFAULT_NETWORK_CAMERA_PROTOCOL}
                    mode={pickerMode}
                    onValueChange={value =>
                      setProtocol(String(value || DEFAULT_NETWORK_CAMERA_PROTOCOL))
                    }>
                    {NETWORK_CAMERA_PROTOCOL_OPTIONS.map(option => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={[styles.fieldBlock, styles.inlineField]}>
                <Text style={styles.fieldLabel}>Colunas</Text>
                <TextInput
                  style={styles.input}
                  value={columns}
                  onChangeText={setColumns}
                  placeholder={DEFAULT_NETWORK_PRINTER_COLUMNS}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {isIpCamera ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Caminho do stream</Text>
                <TextInput
                  style={styles.input}
                  value={streamPath}
                  onChangeText={setStreamPath}
                  placeholder="Ex.: /Streaming/Channels/101"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inlineFields}>
                <View style={[styles.fieldBlock, styles.inlineField]}>
                  <Text style={styles.fieldLabel}>Usuario</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Ex.: admin"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.fieldBlock, styles.inlineField]}>
                  <Text style={styles.fieldLabel}>Senha</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Senha da camera"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Transporte</Text>
              <TextInput
                style={[styles.input, styles.readonlyInput]}
                value={transport || DEFAULT_NETWORK_PRINTER_TRANSPORT}
                editable={false}
              />
            </View>
          )}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Device responsavel</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={managerDeviceId || ''}
                mode={pickerMode}
                onValueChange={value =>
                  setManagerDeviceId(String(value || '').trim())
                }>
                <Picker.Item
                  label="Selecione um PDV ou DISPLAY"
                  value=""
                />
                {managerDeviceOptions.map(option => (
                  <Picker.Item
                    key={option.deviceId}
                    label={option.label}
                    value={option.deviceId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingConfig && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingConfig}
            onPress={savePrinterConfig}>
            {savingConfig ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {isIpCamera
                    ? 'Salvar acesso da camera'
                    : 'Salvar roteamento'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rodape do sistema</Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.footerDebugDescription}
          </Text>

          <TouchableOpacity
            style={[
              styles.toggleRow,
              deviceRuntimeDebugInfoEnabled && styles.toggleRowActive,
            ]}
            activeOpacity={0.85}
            onPress={() =>
              setDeviceRuntimeDebugInfoEnabled(currentValue => !currentValue)
            }>
            <View>
              <Text style={styles.toggleRowLabel}>Exibir debug detalhado</Text>
              <Text style={styles.toggleRowValue}>
                {deviceRuntimeDebugInfoEnabled ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            <Icon
              name={
                deviceRuntimeDebugInfoEnabled ? 'toggle-right' : 'toggle-left'
              }
              size={28}
              color={deviceRuntimeDebugInfoEnabled ? '#22C55E' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingRuntimeDebugInfo && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingRuntimeDebugInfo}
            onPress={saveRuntimeDebugInfoConfig}>
            {savingRuntimeDebugInfo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Salvar debug do rodape
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {deviceConfigId ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {deviceProfile.removeSectionTitle}
            </Text>
            <Text style={styles.sectionDescription}>
              {deviceProfile.removeSectionDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {backgroundColor: '#DC2626'},
                removingConfig && styles.primaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={removingConfig}
              onPress={handleRemoveConfig}>
              {removingConfig ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="trash-2" size={15} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {deviceProfile.removeButtonLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrinterDeviceDetailPage;

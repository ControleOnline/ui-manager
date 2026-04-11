import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
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
import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  buildNetworkPrinterMetadata,
  DEFAULT_NETWORK_PRINTER_COLUMNS,
  DEFAULT_NETWORK_PRINTER_PORT,
  DEFAULT_NETWORK_PRINTER_TRANSPORT,
  getDeviceTypeLabel,
  getPrinterManagerDeviceOptions,
  getPrinterMetadataField,
  NETWORK_PRINTER_COLUMNS_CONFIG_KEY,
  NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  NETWORK_PRINTER_TRANSPORT_CONFIG_KEY,
  normalizePrinterColumns,
  normalizePrinterPort,
  PRINT_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {elevation: 2},
  web: {boxShadow: '0 4px 12px rgba(15,23,42,0.06)'},
});

const resolveErrorMessage = error =>
  error?.response?.data?.['hydra:description'] ||
  error?.response?.data?.message ||
  error?.message ||
  'Nao foi possivel salvar as alteracoes.';

const PrinterDeviceDetailPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    deviceId,
    deviceString,
    deviceType: initialDeviceType,
    alias: initialAlias,
    configs: initialConfigs,
    metadata: initialMetadata,
  } = route.params || {};

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

  const [loading, setLoading] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [alias, setAlias] = useState(initialAlias || '');
  const [manufacturer, setManufacturer] = useState(
    getPrinterMetadataField(initialMetadata, 'manufacturer'),
  );
  const [model, setModel] = useState(getPrinterMetadataField(initialMetadata, 'model'));
  const [version, setVersion] = useState(
    getPrinterMetadataField(initialMetadata, 'version'),
  );
  const [port, setPort] = useState(
    normalizePrinterPort(
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
    normalizeDeviceId(
      initialParsedConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
    ),
  );
  const [transport, setTransport] = useState(
    String(
      initialParsedConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_TRANSPORT,
    ),
  );

  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const normalizedDeviceType =
    String(initialDeviceType || '').trim().toUpperCase() || PRINT_DEVICE_TYPE;
  const scopedDeviceConfigs = useMemo(
    () => filterDeviceConfigsByCompany(companyDeviceConfigs, currentCompany?.id),
    [companyDeviceConfigs, currentCompany?.id],
  );
  const managerDeviceOptions = useMemo(
    () =>
      getPrinterManagerDeviceOptions({
        deviceConfigs: scopedDeviceConfigs,
        companyId: currentCompany?.id,
        excludeDeviceId: deviceString,
      }),
    [currentCompany?.id, deviceString, scopedDeviceConfigs],
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

          const currentDeviceConfig = scopedConfigs.find(deviceConfig => {
            const currentDeviceString = normalizeDeviceId(
              deviceConfig?.device?.device,
            );
            return currentDeviceString === normalizeDeviceId(deviceString);
          });
          const nextConfigs = parseConfigsObject(currentDeviceConfig?.configs);
          const nextMetadata =
            deviceData?.metadata ||
            currentDeviceConfig?.device?.metadata ||
            initialMetadata;

          setAlias(
            deviceData?.alias ||
              currentDeviceConfig?.device?.alias ||
              initialAlias ||
              '',
          );
          setManufacturer(getPrinterMetadataField(nextMetadata, 'manufacturer'));
          setModel(getPrinterMetadataField(nextMetadata, 'model'));
          setVersion(getPrinterMetadataField(nextMetadata, 'version'));
          setPort(
            normalizePrinterPort(
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
            normalizeDeviceId(
              nextConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
            ),
          );
          setTransport(
            String(
              nextConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_TRANSPORT,
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
      initialMetadata,
    ]),
  );

  const saveDeviceRegistration = useCallback(async () => {
    const normalizedAlias = String(alias || '').trim() || deviceString;
    const metadata = buildNetworkPrinterMetadata({
      existingMetadata: initialMetadata,
      host: deviceString,
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
        device: deviceString,
        type: normalizedDeviceType,
        metadata,
      });

      setAlias(savedDevice?.alias || normalizedAlias);
      navigation.setParams({
        alias: savedDevice?.alias || normalizedAlias,
        metadata: savedDevice?.metadata || metadata,
      });
    } catch (error) {
      Alert.alert('Cadastro da impressora', resolveErrorMessage(error));
    } finally {
      setSavingDevice(false);
    }
  }, [
    alias,
    deviceId,
    deviceStore.actions,
    deviceString,
    initialMetadata,
    manufacturer,
    model,
    navigation,
    normalizedDeviceType,
    transport,
    version,
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
        'Selecione qual PDV ou DISPLAY executa a impressao desta impressora.',
      );
      return;
    }

    const nextConfigs = {
      [NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]: managerDeviceId,
      [NETWORK_PRINTER_PORT_CONFIG_KEY]: normalizePrinterPort(port),
      [NETWORK_PRINTER_COLUMNS_CONFIG_KEY]: normalizePrinterColumns(columns),
      [NETWORK_PRINTER_TRANSPORT_CONFIG_KEY]:
        String(transport || '').trim() || DEFAULT_NETWORK_PRINTER_TRANSPORT,
    };

    setSavingConfig(true);

    try {
      await deviceConfigStore.actions.addDeviceConfigs({
        device: deviceString,
        people: `/people/${currentCompany.id}`,
        configs: JSON.stringify(nextConfigs),
      });

      navigation.setParams({configs: nextConfigs});
    } catch (error) {
      Alert.alert('Configuracao da impressora', resolveErrorMessage(error));
    } finally {
      setSavingConfig(false);
    }
  }, [
    columns,
    currentCompany?.id,
    deviceConfigStore.actions,
    deviceString,
    managerDeviceId,
    navigation,
    port,
    transport,
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
            <Icon name="printer" size={20} color={brandColors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {alias || 'Impressora de rede'}
            </Text>
            <Text style={styles.heroText}>
              {getDeviceTypeLabel(normalizedDeviceType)} vinculada ao endereco{' '}
              {deviceString}
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Atualizando dados da impressora...</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cadastro da impressora</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome exibido</Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder="Nome da impressora"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>IP ou hostname</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              value={deviceString || ''}
              editable={false}
              selectTextOnFocus
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
          <Text style={styles.sectionTitle}>Roteamento de impressao</Text>
          <Text style={styles.sectionDescription}>
            O backend continua gerando a impressao para o device da impressora.
            Aqui voce define qual PDV ou DISPLAY local fica responsavel por
            consumir essa fila e falar com a impressora na rede.
          </Text>

          <View style={styles.inlineFields}>
            <View style={[styles.fieldBlock, styles.inlineField]}>
              <Text style={styles.fieldLabel}>Porta TCP</Text>
              <TextInput
                style={styles.input}
                value={port}
                onChangeText={setPort}
                placeholder={DEFAULT_NETWORK_PRINTER_PORT}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>

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
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Transporte</Text>
            <TextInput
              style={[styles.input, styles.readonlyInput]}
              value={transport || DEFAULT_NETWORK_PRINTER_TRANSPORT}
              editable={false}
            />
          </View>

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
                  Salvar roteamento
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  scroll: {
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...cardShadow,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 14,
  },
  readonlyInput: {
    color: '#475569',
    backgroundColor: '#F1F5F9',
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...cardShadow,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});

export default PrinterDeviceDetailPage;

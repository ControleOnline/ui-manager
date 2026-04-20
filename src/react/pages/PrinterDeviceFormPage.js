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
  buildNetworkPrinterMetadata,
  DEFAULT_NETWORK_PRINTER_COLUMNS,
  DEFAULT_NETWORK_PRINTER_MANUFACTURER,
  DEFAULT_NETWORK_PRINTER_MODEL,
  DEFAULT_NETWORK_PRINTER_PORT,
  DEFAULT_NETWORK_PRINTER_TRANSPORT,
  getPrinterManagerDeviceOptions,
  NETWORK_PRINTER_COLUMNS_CONFIG_KEY,
  NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  NETWORK_PRINTER_TRANSPORT_CONFIG_KEY,
  normalizePrinterColumns,
  normalizePrinterHost,
  normalizePrinterPort,
  PRINT_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import styles from './PrinterDeviceFormPage.styles';

const PrinterDeviceFormPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const normalizedDeviceType =
    String(route.params?.deviceType || '').trim().toUpperCase() ||
    PRINT_DEVICE_TYPE;
  const deviceProfile = useMemo(
    () => getNetworkDeviceProfile(normalizedDeviceType),
    [normalizedDeviceType],
  );

  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const themeStore = useStore('theme');

  const {currentCompany} = peopleStore.getters;
  const {items: companyDeviceConfigs = [], isLoading: isLoadingDeviceConfigs} =
    deviceConfigStore.getters;
  const {colors: themeColors} = themeStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [alias, setAlias] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(DEFAULT_NETWORK_PRINTER_PORT);
  const [columns, setColumns] = useState(DEFAULT_NETWORK_PRINTER_COLUMNS);
  const [manufacturer, setManufacturer] = useState(
    DEFAULT_NETWORK_PRINTER_MANUFACTURER,
  );
  const [model, setModel] = useState(DEFAULT_NETWORK_PRINTER_MODEL);
  const [version, setVersion] = useState('');
  const [managerDeviceId, setManagerDeviceId] = useState('');
  const [saving, setSaving] = useState(false);

  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;

  const managerDeviceOptions = useMemo(
    () =>
      getPrinterManagerDeviceOptions({
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) {
        return;
      }

      deviceConfigStore.actions
        .getItems({people: `/people/${currentCompany.id}`})
        .catch(() => {});
    }, [currentCompany?.id, deviceConfigStore.actions]),
  );

  const handleSave = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        deviceProfile.companyMissingMessage,
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(host);
    if (!normalizedHost) {
      Alert.alert(
        deviceProfile.hostAlertTitle,
        deviceProfile.hostMissingMessage,
      );
      return;
    }

    if (!managerDeviceId) {
      Alert.alert(
        'Device responsavel',
        deviceProfile.managerMissingMessage,
      );
      return;
    }

    const normalizedPort = normalizePrinterPort(port);
    const normalizedColumns = normalizePrinterColumns(columns);
    const normalizedAlias =
      String(alias || '').trim() ||
      [manufacturer, model].map(item => String(item || '').trim()).filter(Boolean).join(' ') ||
      normalizedHost;
    const metadata = buildNetworkPrinterMetadata({
      host: normalizedHost,
      manufacturer,
      model,
      version,
      transport: DEFAULT_NETWORK_PRINTER_TRANSPORT,
    });

    setSaving(true);

    try {
      const savedDevice = await deviceStore.actions.save({
        alias: normalizedAlias,
        device: normalizedHost,
        metadata,
      });

      const configs = {
        [NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]: managerDeviceId,
        [NETWORK_PRINTER_PORT_CONFIG_KEY]: normalizedPort,
        [NETWORK_PRINTER_COLUMNS_CONFIG_KEY]: normalizedColumns,
        [NETWORK_PRINTER_TRANSPORT_CONFIG_KEY]:
          DEFAULT_NETWORK_PRINTER_TRANSPORT,
      };

      const savedDeviceConfig = await deviceConfigStore.actions.addDeviceConfigs({
        device: savedDevice?.device || normalizedHost,
        people: `/people/${currentCompany.id}`,
        type: normalizedDeviceType,
        configs: JSON.stringify(configs),
      });

      navigation.replace(deviceProfile.detailRouteName, {
        dcId: savedDeviceConfig?.id,
        deviceId: savedDevice?.id,
        deviceString: savedDevice?.device || normalizedHost,
        deviceType: normalizedDeviceType,
        alias: savedDevice?.alias || normalizedAlias,
        configs,
        metadata: savedDevice?.metadata || metadata,
      });
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.message ||
        error?.message ||
        deviceProfile.registerErrorMessage;

      Alert.alert(deviceProfile.registerErrorTitle, message);
    } finally {
      setSaving(false);
    }
  }, [
    alias,
    columns,
    currentCompany?.id,
    deviceConfigStore.actions,
    deviceStore.actions,
    host,
    managerDeviceId,
    manufacturer,
    model,
    navigation,
    normalizedDeviceType,
    port,
    version,
    deviceProfile,
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
            <Text style={styles.heroTitle}>{deviceProfile.heroTitle}</Text>
            <Text style={styles.heroText}>
              {deviceProfile.heroText}
            </Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Icon name="info" size={14} color="#B45309" />
          <Text style={styles.noticeText}>
            A descoberta automatica na rede ainda nao esta disponivel nesta
            tela. O cadastro inicial e manual.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Identificacao</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome exibido</Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder={deviceProfile.aliasPlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>IP ou hostname</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="192.168.0.120"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Device responsavel</Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.managerSectionDescription}
          </Text>

          {isLoadingDeviceConfigs ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={brandColors.primary} />
              <Text style={styles.loadingText}>Carregando devices da empresa...</Text>
            </View>
          ) : (
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={managerDeviceId || ''}
                mode={pickerMode}
                onValueChange={value => setManagerDeviceId(String(value || '').trim())}>
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
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Configuracao inicial</Text>

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
            <Text style={styles.fieldLabel}>Fabricante</Text>
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Bematech"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="MP-2800 TH"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Versao/Firmware</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="Ex.: 1.0.0"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.transportRow}>
            <Icon name="wifi" size={14} color="#0F172A" />
            <Text style={styles.transportText}>
              Transporte previsto: TCP RAW ({DEFAULT_NETWORK_PRINTER_PORT})
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {backgroundColor: brandColors.primary},
            saving && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={saving}
          onPress={handleSave}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={15} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {deviceProfile.createButtonLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrinterDeviceFormPage;

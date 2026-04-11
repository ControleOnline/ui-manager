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
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
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

const PrinterDeviceFormPage = () => {
  const navigation = useNavigation();

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
        'Selecione uma empresa antes de cadastrar a impressora.',
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(host);
    if (!normalizedHost) {
      Alert.alert('IP da impressora', 'Informe o IP ou hostname da impressora.');
      return;
    }

    if (!managerDeviceId) {
      Alert.alert(
        'Device responsavel',
        'Selecione o PDV ou DISPLAY responsavel por receber e encaminhar as impressoes.',
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
        type: PRINT_DEVICE_TYPE,
        metadata,
      });

      const configs = {
        [NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]: managerDeviceId,
        [NETWORK_PRINTER_PORT_CONFIG_KEY]: normalizedPort,
        [NETWORK_PRINTER_COLUMNS_CONFIG_KEY]: normalizedColumns,
        [NETWORK_PRINTER_TRANSPORT_CONFIG_KEY]:
          DEFAULT_NETWORK_PRINTER_TRANSPORT,
      };

      await deviceConfigStore.actions.addDeviceConfigs({
        device: savedDevice?.device || normalizedHost,
        people: `/people/${currentCompany.id}`,
        configs: JSON.stringify(configs),
      });

      navigation.replace('PrinterDeviceDetail', {
        deviceId: savedDevice?.id,
        deviceString: savedDevice?.device || normalizedHost,
        deviceType: savedDevice?.type || PRINT_DEVICE_TYPE,
        alias: savedDevice?.alias || normalizedAlias,
        configs,
        metadata: savedDevice?.metadata || metadata,
      });
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.message ||
        error?.message ||
        'Nao foi possivel cadastrar a impressora.';

      Alert.alert('Erro ao cadastrar impressora', message);
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
    port,
    version,
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
            <Text style={styles.heroTitle}>Nova impressora de rede</Text>
            <Text style={styles.heroText}>
              Cadastre a impressora pelo IP/hostname e vincule qual device
              local vai executar a impressao na rede.
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
              placeholder="Ex.: Impressora Caixa 1"
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
            Este PDV ou DISPLAY sera o gateway local que acompanha as impressoes
            desta impressora de rede.
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
              <Text style={styles.primaryButtonText}>Cadastrar impressora</Text>
            </>
          )}
        </TouchableOpacity>
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
    alignItems: 'flex-start',
    gap: 14,
    ...cardShadow,
  },
  heroIcon: {
    width: 42,
    height: 42,
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
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  noticeCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#92400E',
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
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  transportText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 48,
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

export default PrinterDeviceFormPage;

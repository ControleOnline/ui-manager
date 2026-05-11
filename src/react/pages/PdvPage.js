import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';

import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import {
  parseConfigsObject,
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderType,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {filterDeviceConfigsByCompany} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const PDV_DEVICE_CONFIG_TYPE = 'PDV';

const normalizeEntityId = value =>
  String(value?.id || value || '')
    .replace(/\D/g, '')
    .trim();

const selectLatestPdvConfig = ({items, companyId, deviceId}) =>
  filterDeviceConfigsByCompany(items, companyId)
    .filter(
      item =>
        String(item?.device?.device || item?.device?.id || '').trim() ===
          String(deviceId || '').trim() &&
        String(item?.type || '').trim().toUpperCase() === PDV_DEVICE_CONFIG_TYPE,
    )
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] ||
  null;

const buildFallbackPdvConfig = ({
  companyId,
  currentConfig,
  deviceId,
}) => ({
  type: PDV_DEVICE_CONFIG_TYPE,
  people:
    currentConfig?.people ||
    (normalizeEntityId(companyId) ? `/people/${normalizeEntityId(companyId)}` : null),
  device:
    currentConfig?.device || {
      id: deviceId,
      device: deviceId,
    },
  configs: {},
});

export default function PdvPage({navigation, route}) {
  const deviceConfigStore = useStore('device_config');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigActions = deviceConfigStore.actions;
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {item: storagedDevice} = deviceStore.getters;
  const previousRuntimeConfigRef = useRef(null);
  const [pdvConfigReady, setPdvConfigReady] = useState(false);
  const linkedOrderType = useMemo(
    () => resolvePosCheckOrderType(runtimeDeviceConfig?.configs),
    [runtimeDeviceConfig?.configs],
  );
  const settlementLabel = useMemo(
    () => global.t?.t('orders', 'title', 'linkedOrderSettlement'),
    [],
  );
  const pdvRoute = useMemo(
    () => ({
      ...route,
      params: {
        ...(route?.params || {}),
        interactionMode: 'pdv',
        runtimeDeviceConfigType: PDV_DEVICE_CONFIG_TYPE,
        showBottomCart: true,
        showBottomToolBar: true,
      },
    }),
    [route],
  );

  useEffect(() => {
    if (previousRuntimeConfigRef.current !== null) {
      return;
    }

    previousRuntimeConfigRef.current =
      runtimeDeviceConfig && Object.keys(runtimeDeviceConfig).length > 0
        ? runtimeDeviceConfig
        : {};
  }, [runtimeDeviceConfig]);

  useEffect(() => {
    let cancelled = false;

    if (!currentCompany?.id || !storagedDevice?.id) {
      setPdvConfigReady(false);
      return () => {
        cancelled = true;
      };
    }

    setPdvConfigReady(false);

    deviceConfigActions
      .getItems({
        'device.device': storagedDevice.id,
        people: `/people/${currentCompany.id}`,
        type: PDV_DEVICE_CONFIG_TYPE,
      })
      .then(items => {
        if (cancelled) {
          return;
        }

        const selectedConfig = selectLatestPdvConfig({
          items,
          companyId: currentCompany.id,
          deviceId: storagedDevice.id,
        });

        if (selectedConfig) {
          deviceConfigActions.setItem({
            ...selectedConfig,
            configs: parseConfigsObject(selectedConfig?.configs),
          });
          return;
        }

        deviceConfigActions.setItem(
          buildFallbackPdvConfig({
            companyId: currentCompany.id,
            currentConfig: previousRuntimeConfigRef.current,
            deviceId: storagedDevice.id,
          }),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        deviceConfigActions.setItem(
          buildFallbackPdvConfig({
            companyId: currentCompany.id,
            currentConfig: previousRuntimeConfigRef.current,
            deviceId: storagedDevice.id,
          }),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setPdvConfigReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentCompany?.id, deviceConfigActions, storagedDevice?.id]);

  useEffect(
    () => () => {
      const previousRuntimeConfig = previousRuntimeConfigRef.current;

      deviceConfigActions.setItem(
        previousRuntimeConfig && Object.keys(previousRuntimeConfig).length > 0
          ? previousRuntimeConfig
          : {},
      );
    },
    [deviceConfigActions],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate('LinkedOrderSettlementPage', {
              ...(linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE
                ? {orderType: linkedOrderType}
                : {}),
            })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#BFDBFE',
            backgroundColor: '#EFF6FF',
          }}>
          <Icon name="layers" size={14} color="#0369A1" />
          <Text
            style={{
              color: '#0369A1',
              fontSize: 12,
              fontWeight: '800',
            }}>
            {settlementLabel}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [linkedOrderType, navigation, settlementLabel]);

  if (!pdvConfigReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: 24,
        }}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text
          style={{
            color: '#1F2937',
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'center',
          }}>
          Preparando configuracao operacional do PDV...
        </Text>
      </View>
    );
  }

  return <AddProductScreen navigation={navigation} route={pdvRoute} />;
}

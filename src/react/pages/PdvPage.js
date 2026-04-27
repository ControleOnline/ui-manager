import React, {useEffect, useMemo} from 'react';
import {Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';

import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';
import {
  POS_CHECK_ORDER_TYPE_NONE,
  resolvePosCheckOrderType,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {resolveLinkedOrderLabel} from '@controleonline/ui-orders/src/react/utils/linkedOrderContext';

export default function PdvPage({navigation, route}) {
  const deviceConfigStore = useStore('device_config');
  const {item: runtimeDeviceConfig} = deviceConfigStore.getters;
  const linkedOrderType = useMemo(
    () => resolvePosCheckOrderType(runtimeDeviceConfig?.configs),
    [runtimeDeviceConfig?.configs],
  );
  const linkedOrderLabel = useMemo(
    () => resolveLinkedOrderLabel(linkedOrderType),
    [linkedOrderType],
  );
  const canOpenSettlement = linkedOrderType !== POS_CHECK_ORDER_TYPE_NONE;
  const pdvRoute = useMemo(
    () => ({
      ...route,
      params: {
        ...(route?.params || {}),
        interactionMode: 'pdv',
        showBottomCart: true,
        showBottomToolBar: true,
      },
    }),
    [route],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: canOpenSettlement
        ? () => (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('LinkedOrderSettlementPage', {
                  orderType: linkedOrderType,
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
                {linkedOrderLabel}
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [canOpenSettlement, linkedOrderLabel, linkedOrderType, navigation]);

  return <AddProductScreen navigation={navigation} route={pdvRoute} />;
}

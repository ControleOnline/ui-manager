import React, {useEffect, useCallback, useState, useRef} from 'react';
import {Text, View, ScrollView, SafeAreaView} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {useStore} from '@store';
import {useFocusEffect} from '@react-navigation/native';

const CashRegisters = () => {
  const {styles, globalStyles} = css();
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const invoiceStore = useStore('invoice');
  const invoiceGetters = invoiceStore.getters;
  const invoiceActions = invoiceStore.actions;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const deviceConfigActions = device_configStore.actions;
  const {currentCompany} = peopleGetters;
  const {isLoading: isLoadingDeviceConfigs, items: deviceConfigs} =
    deviceConfigGetters;
  const {isLoading, error} = invoiceGetters;
  const [inflowsByDevice, setInflowsByDevice] = useState({});
  const [previousCompany, setPreviousCompany] = useState({});

  useEffect(() => {
    const hasCompanyChanged =
      !previousCompany || previousCompany.id !== currentCompany.id;

    if (
      currentCompany &&
      (hasCompanyChanged || !deviceConfigs || deviceConfigs.length == 0)
    )
      deviceConfigActions.getItems({
        people: '/people/' + currentCompany.id,
      });

    setPreviousCompany(currentCompany);
  }, [currentCompany]);

  useFocusEffect(
    useCallback(() => {
      if (deviceConfigs.length > 0) {
        const promises = deviceConfigs.map(deviceConfig => {
          const device = deviceConfig.device.device.replace(/\D/g, '');
          return invoiceActions
            .getInflow({
              receiver: currentCompany.id,
              'device.device': device,
            })
            .then(data => ({[device]: data}));
        });
        setInflowsByDevice([]);
        Promise.all(promises).then(results => {
          const newInflows = results.reduce(
            (acc, curr) => ({...acc, ...curr}),
            {},
          );
          setInflowsByDevice(prev => ({...prev, ...newInflows}));
        });
      }
    }, [deviceConfigs]),
  );

  const renderWalletGroup = deviceConfig => {
    const walletGroups = walletData ? Object.values(walletData) : [];
    const walletData =
      inflowsByDevice[deviceConfig.device.id]?.[0]?.payments?.wallet;
    const deviceTotal =
      inflowsByDevice[deviceConfig.device.id]?.[0]?.payments?.total;

    return (
      <View style={styles.CashRegister.groupContainer}>
        {walletGroups.length > 0
          ? walletGroups.map((group, groupIndex) => {
              const groupKey = `${deviceConfig.id}-${groupIndex}`;
              return (
                <View
                  key={groupKey}
                  style={[
                    styles.CashRegister.walletContainer,
                    styles.OrderHeader.boxWrap,
                  ]}>
                  <View style={styles.boxHeader}>
                    <Text
                      style={[styles.CashRegister.walletTitle, styles.primary]}>
                      {group.wallet}
                    </Text>
                  </View>
                  {Object.values(group.payment || {}).map(
                    (payment, paymentIndex) => {
                      const paymentKey = `${deviceConfig.device.id}-wallet-${group.wallet}-payment-${payment.payment}-${paymentIndex}`;
                      return (
                        <View
                          key={paymentKey}
                          style={[
                            styles.boxContent,
                            {flexDirection: 'column', marginVertical: 2},
                          ]}>
                          {payment.inflow > 0 && (
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                              }}>
                              <Text
                                style={[
                                  styles.CashRegister.paymentText,
                                  styles.boxTextColor,
                                ]}>
                                {payment.payment}
                              </Text>
                              <Text
                                style={[
                                  styles.CashRegister.paymentText,
                                  styles.boxTextColor,
                                ]}>
                                {Formatter.formatMoney(payment.inflow)}
                              </Text>
                            </View>
                          )}
                          {payment.withdrawal > 0 && (
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                              }}>
                              <Text
                                style={[
                                  styles.CashRegister.paymentText,
                                  {color: 'red'},
                                ]}>
                                Sangria {group.wallet}
                              </Text>
                              <Text
                                style={[
                                  styles.CashRegister.paymentText,
                                  {color: 'red'},
                                ]}>
                                {Formatter.formatMoney(payment.withdrawal)}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    },
                  )}
                  <View
                    style={[
                      styles.boxContent,
                      {
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 5,
                      },
                    ]}>
                    <Text
                      style={[styles.CashRegister.walletTotal, styles.primary]}>
                      Total
                    </Text>
                    <Text
                      style={[
                        styles.CashRegister.walletTotal,
                        styles.primary,
                        styles.boxPrice,
                      ]}>
                      {Formatter.formatMoney(group.total || 0)}
                    </Text>
                  </View>
                </View>
              );
            })
          : !isLoading &&
            !isLoadingDeviceConfigs && (
              <View
                style={[
                  styles.CashRegister.walletContainer,
                  styles.OrderHeader.boxWrap,
                ]}>
                <Text
                  style={[
                    styles.CashRegister.paymentText,
                    styles.boxTextColor,
                  ]}>
                  Nenhum resultado encontrado
                </Text>
              </View>
            )}
        {walletGroups.length > 0 && deviceTotal !== undefined && (
          <View style={styles.CloseCashRegister.footerContainer}>
            <View style={styles.CloseCashRegister.totalContainer}>
              <Text style={styles.CloseCashRegister.total}>TOTAL</Text>
              <Text style={styles.CloseCashRegister.total}>
                {Formatter.formatMoney(deviceTotal)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StateStore store="invoice" />
      <StateStore store="device_config" />
      {!isLoading && !isLoadingDeviceConfigs && (
        <ScrollView contentContainerStyle={styles.scrollView}>
          {deviceConfigs.length > 0
            ? deviceConfigs.map(deviceConfig => {
                return (
                  <View
                    key={deviceConfig.id}
                    style={styles.CashRegister.mainContainer}>
                    <Text
                      style={[
                        styles.CashRegister.walletTitle,
                        styles.primary,
                        globalStyles.textCenter,
                      ]}>
                      {deviceConfig.device.alias}
                    </Text>
                    {renderWalletGroup(deviceConfig)}
                  </View>
                );
              })
            : !isLoading &&
              !isLoadingDeviceConfigs && (
                <View style={styles.CashRegister.mainContainer}>
                  <Text
                    style={[
                      styles.CashRegister.paymentText,
                      styles.boxTextColor,
                      globalStyles.textCenter,
                    ]}>
                    Nenhum dispositivo encontrado
                  </Text>
                </View>
              )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default CashRegisters;

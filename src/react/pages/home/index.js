import React from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Text,
  useWindowDimensions,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useStore } from '@store'

export default function HomePage({ navigation }) {
  const { width } = useWindowDimensions()

  const themeStore = useStore('theme')
  const peopleStore = useStore('people')

  const { colors } = themeStore.getters
  const { currentCompany } = peopleStore.getters

  const handleTo = to => navigation.navigate(to)

  const numColumns =
    width >= 1600 ? 6 :
      width >= 1200 ? 5 :
        width >= 900 ? 4 :
          width >= 600 ? 3 : 2

  const spacing = 16
  const totalSpacing = spacing * (numColumns + 1)
  const buttonSize = (width - totalSpacing - 40) / numColumns

  const iconSize = Math.max(20, Math.min(40, buttonSize * 0.22))
  const fontSize = Math.max(12, Math.min(16, buttonSize * 0.14))

  const buttons = [
    {
      id: '6',
      title: global.t?.t('configs','button_title','customers'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('ClientsIndex'),
    },
    {
      id: '6',
      title: global.t?.t('configs','button_title','crmSettings'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CRMSettings'),
    },
    {
      id: '5',
       title: global.t?.t('configs','button_title','products'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CategoriesPage'),
    },
    {
      id: '7',
       title: global.t?.t('configs','button_title','saleOrders'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('SalesOrderIndex'),
    },
    {
      id: '8',
      title: global.t?.t('configs','button_title','providers'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('ProvidersIndex'),
    },
    {
      id: '9',
       title: global.t?.t('configs','button_title','receivables'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('Receivables'),
    },
    {
      id: '10',
       title: global.t?.t('configs','button_title','payables'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('Payables'),
    },
    {
      id: '11',
       title: global.t?.t('configs','button_title','transfers'),
      icon: 'exchange',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('OwnTransfers'),
    },
    {
      id: '1',
      title: global.t?.t('configs','button_title','results'),
      icon: 'money',
      backgroundColor: colors?.primary || '#1B5587',
      onPress: () => handleTo('IncomeStatement'),
    },
    {
      id: '2',
      title: global.t?.t('configs','button_title','purchasingSuggestion'),
      icon: 'shopping-bag',
      backgroundColor: '#4ca96b',
      onPress: () => handleTo('PurchasingSuggestion'),
    },
    {
      id: '3',
      title: global.t?.t('configs','button_title','inventory'),
      icon: 'archive',
      backgroundColor: '#b48c46',
      onPress: () => handleTo('Inventory'),
    },
    {
      id: '4',
       title: global.t?.t('configs','button_title','cashRegisters'),
      icon: 'shopping-cart',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CashRegistersIndex'),
    },
    {
      id: '12',
      title: global.t?.t('configs','button_title','ppc'),
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('DisplayList'),
    },
    {
      id: '13',
      title: global.t?.t('configs','button_title','integrations'),
      icon: 'plug',
      backgroundColor: colors?.primary || '#1B5587',
      onPress: () => handleTo('IntegrationsPage'),
    },
    {
      id: '14',
      title: global.t?.t('configs','button_title','99FoodOrderHistory'),
      icon: 'clock-o',
      backgroundColor: '#F97316',
      onPress: () => handleTo('Food99OrderHistoryPage'),
    },
  ]

  const renderButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: item.backgroundColor,
          width: buttonSize,
          height: buttonSize,
          margin: spacing / 2,
        },
      ]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <FontAwesome name={item.icon} size={iconSize} color="#fff" />
      <Text style={[styles.buttonText, { fontSize }]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  )

  if (!currentCompany || !colors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Carregando...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        key={numColumns}
        data={buttons}
        renderItem={renderButton}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        contentContainerStyle={{
          paddingHorizontal: spacing / 2,
          paddingBottom: 40,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 30,
    paddingBottom: 60,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonText: {
    marginTop: 10,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

import React from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useStore } from '@store'

export default function HomePage({ navigation }) {
  const themeStore = useStore('theme')
  const peopleStore = useStore('people')

  const { colors } = themeStore.getters
  const { currentCompany } = peopleStore.getters

  const handleTo = to => navigation.navigate(to)

  const buttons = [
    {
      id: '6',
      title: 'Clientes',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('ClientsIndex'),
    },
    {
      id: '5',
      title: 'Produtos',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CategoriesPage'),
    },
    {
      id: '7',
      title: 'Pedidos de venda',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('SalesOrderIndex'),
    },
    {
      id: '8',
      title: 'Fornecedores',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('ProvidersIndex'),
    },
    {
      id: '9',
      title: 'Contas a receber',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('Receivables'),
    },
    {
      id: '10',
      title: 'Contas a pagar',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('Payables'),
    },
    {
      id: '1',
      title: 'Resultados',
      icon: 'money',
      backgroundColor: colors?.primary || '#1B5587',
      onPress: () => handleTo('IncomeStatement'),
    },
    {
      id: '2',
      title: 'Sugestão de Compras',
      icon: 'shopping-bag',
      backgroundColor: '#4ca96b',
      onPress: () => handleTo('PurchasingSuggestion'),
    },
    {
      id: '3',
      title: 'Estoque',
      icon: 'archive',
      backgroundColor: '#b48c46',
      onPress: () => handleTo('Inventory'),
    },
    {
      id: '4',
      title: 'Caixas',
      icon: 'shopping-cart',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('CashRegistersIndex'),
    },
    {
      id: '5',
      title: 'PCP',
      icon: 'desktop',
      backgroundColor: '#4682b4',
      onPress: () => handleTo('DisplayList'),
    },
  ]

  const renderButton = ({ item }) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: item.backgroundColor }]}
      onPress={item.onPress}>
      <FontAwesome name={item.icon} size={30} color="#fff" />
      <Text style={styles.buttonText}>{item.title}</Text>
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
        data={buttons}
        renderItem={renderButton}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.content}
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
  content: {
    paddingBottom: 20,
  },
  button: {
    width: '48%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 10,
  },
  buttonText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

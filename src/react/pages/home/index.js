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
    title: 'Clientes',
    icon: 'desktop',
    backgroundColor: '#355F86',
  },
  {
    id: '5',
    title: 'Produtos',
    icon: 'desktop',
    backgroundColor: '#4CAF50',
  },
  {
    id: '7',
    title: 'Pedidos de venda',
    icon: 'desktop',
    backgroundColor: '#2D74DA',
  },
  {
    id: '8',
    title: 'Fornecedores',
    icon: 'desktop',
    backgroundColor: '#3E6FA1',
  },
  {
    id: '9',
    title: 'Contas a receber',
    icon: 'desktop',
    backgroundColor: '#215FB6',
  },
  {
    id: '10',
    title: 'Contas a pagar',
    icon: 'desktop',
    backgroundColor: '#C51162',
  },
  {
    id: '11',
    title: 'Transferências',
    icon: 'exchange',
    backgroundColor: '#2F80A9',
  },
  {
    id: '1',
    title: 'Resultados',
    icon: 'money',
    backgroundColor: '#1EB980',
  },
  {
    id: '2',
    title: 'Sugestão de Compras',
    icon: 'shopping-bag',
    backgroundColor: '#43A047',
  },
  {
    id: '3',
    title: 'Estoque',
    icon: 'archive',
    backgroundColor: '#2E7D32',
  },
  {
    id: '4',
    title: 'Caixas',
    icon: 'shopping-cart',
    backgroundColor: '#1F5DA8',
  },
  {
    id: '12',
    title: 'PCP',
    icon: 'desktop',
    backgroundColor: '#2C3E50',
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
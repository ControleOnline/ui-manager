import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {Text} from 'react-native-animatable';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import {useStore} from '@store';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function HomePage({navigation}) {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore.getters;
  const {item: device} = deviceConfigGetters;
  const {colors} = getters;
  const {currentCompany} = peopleGetters;
  const handleTo = to => {
    navigation.navigate(to);
  };

  const buttons = [
    {
      id: '1',
      title: 'Faturamento',
      icon: 'money',
      backgroundColor: colors['primary'],
      onPress: () => handleTo('IncomeStatment'),
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
  ];

  const renderButton = ({item}) => (
    <TouchableOpacity
      style={[styles.button, {backgroundColor: item.backgroundColor}]}
      onPress={item.onPress}>
      <Icon name={item.icon} size={30} color="#fff" style={styles.icon} />
      <Text style={styles.buttonText}>{item.title}</Text>
    </TouchableOpacity>
  );
  if (
    !currentCompany ||
    Object.entries(currentCompany).length === 0 ||
    !colors ||
    Object.entries(colors).length === 0
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors['primary'] || '#0000ff'}
        />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={buttons}
        renderItem={renderButton}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
      />
    </View>
  );
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
  row: {
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 10,
  },
  icon: {
    marginBottom: 5,
  },
  buttonText: {
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

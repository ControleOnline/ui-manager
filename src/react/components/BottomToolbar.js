import {useNavigationState} from '@react-navigation/native';
import {getStore} from '@store';
import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const BottomToolbar = ({navigation}) => {
  const state = useNavigationState(state => state);
  const activeTab = state.routes[state.index]?.name || 'HomePage';
  const currentPageName =
    navigation.getState().routes[navigation.getState().index].name;
  const {getters: deviceConfigGetters} = getStore('device_config');
  const {item: device} = deviceConfigGetters;
  const {getters: authGetters, actions: authActions} = getStore('auth');
  const {getters: peopleGetters} = getStore('people');
  const {getters} = getStore('theme');
  const {isLogged} = authGetters;
  const {colors} = getters;
  const {currentCompany} = peopleGetters;
  const [posType, setPosType] = useState(null);
  const localDevice = JSON.parse(localStorage.getItem('device') || '{}');

  const styles = StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderTopColor: '#ddd',
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      color: '#666',
      marginTop: 6,
    },
    activeText: {
      color: colors.primary,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.button}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }
        onPress={() => {
          navigation.navigate('HomePage');
        }}>
        <Icon
          name="home"
          size={15}
          color={activeTab === 'HomePage' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'HomePage' && styles.activeText,
          ]}>
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('CrmIndex');
        }}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }>
        <Icon
          name="dollar-sign"
          size={15}
          color={activeTab === 'CrmIndex' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'CrmIndex' && styles.activeText,
          ]}>
          Oportunidades
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('ClientsIndex');
        }}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }>
        <Icon
          name="shopping-bag"
          size={15}
          color={activeTab === 'ClientsIndex' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'ClientsIndex' && styles.activeText,
          ]}>
          Clientes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('ProfilePage');
        }}
        disabled={
          !currentCompany || Object.entries(currentCompany).length === 0
        }>
        <Icon
          name="user"
          size={15}
          color={activeTab === 'ProfilePage' ? '#007AFF' : '#666'}
        />
        <Text
          style={[
            styles.buttonText,
            activeTab === 'ProfilePage' && styles.activeText,
          ]}>
          Perfil
        </Text>
      </TouchableOpacity>
    </View>
  );
};
export default BottomToolbar;

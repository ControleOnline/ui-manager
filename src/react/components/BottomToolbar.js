import { useNavigationState } from '@react-navigation/native';
import {useStore} from '@store';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import createStyles from './BottomToolbar.styles';

const BottomToolbar = ({navigation}) => {
  const state = useNavigationState(state => state);
  const currentRoute = state.routes[state.index]?.name || 'HomePage';
  const activeTab =
    currentRoute === 'EmployeesIndex' || currentRoute === 'ClientDetails'
      ? 'ClientsIndex'
      : currentRoute;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors} = getters;
  const {currentCompany} = peopleGetters;
  const styles = createStyles(colors);

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

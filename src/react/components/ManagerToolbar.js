import { useNavigationState } from '@react-navigation/native';
import { useStore } from '@store';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const ManagerToolbar = ({ navigation }) => {
  const state = useNavigationState(state => state);
  const activeTab = state?.routes?.[state.index]?.name || 'HomePage';

  const device_configStore = useStore('device_config');
  const deviceConfigGetters = device_configStore?.getters || {};
  const { item: device } = deviceConfigGetters;

  const authStore = useStore('auth');
  const authGetters = authStore?.getters || {};

  const peopleStore = useStore('people');
  const peopleGetters = peopleStore?.getters || {};

  const themeStore = useStore('theme');
  const getters = themeStore?.getters || {};

  const { isLogged } = authGetters;
  const { colors = {} } = getters;
  const { currentCompany } = peopleGetters;

  const primaryColor = colors['primary'] || '#007AFF';
  const isCompanyValid =
    currentCompany && Object.keys(currentCompany).length > 0;

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
      color: primaryColor,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.button}
        disabled={!isCompanyValid}
        onPress={() => navigation.navigate('HomePage')}>
        <Icon
          name="home"
          size={18}
          color={activeTab === 'HomePage' ? primaryColor : '#666'}
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
        disabled={!isCompanyValid}
        onPress={() => navigation.navigate('CrmIndex')}>
        <Icon
          name="dollar-sign"
          size={18}
          color={activeTab === 'CrmIndex' ? primaryColor : '#666'}
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
        disabled={!isCompanyValid}
        onPress={() => navigation.navigate('ClientsIndex')}>
        <Icon
          name="shopping-bag"
          size={18}
          color={activeTab === 'ClientsIndex' ? primaryColor : '#666'}
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
        disabled={!isCompanyValid}
        onPress={() => navigation.navigate('ProfilePage')}>
        <Icon
          name="user"
          size={18}
          color={activeTab === 'ProfilePage' ? primaryColor : '#666'}
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
export default ManagerToolbar;
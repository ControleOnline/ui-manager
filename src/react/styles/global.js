const {StyleSheet} = require('react-native');
import {getStore} from '@store';

export default css = () => {
  const {getters} = getStore('theme');
  const {colors} = getters;
  const globalStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f4f4f4',
      paddingTop: 20,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      padding: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
      flex: 1,
      color: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors['primary'],
      flexDirection: 'row',
    },
    btnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    primary: {
      backgroundColor: colors['primary'],
      color: '#000000',
    },
    state: {
      errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 5,
      },
      errorText: {
        color: '#000',
      },
    },
  });
  return globalStyles;
};

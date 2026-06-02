import { StyleSheet } from 'react-native';
const createStyles = brandColors =>
  StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      backgroundColor: brandColors.background,
      borderTopWidth: 1,
      borderTopColor: brandColors.border,
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      color: brandColors.textSecondary,
      marginTop: 6,
    },
    activeText: {
      color: brandColors.primary,
      fontWeight: 'bold',
    },
  });

export default createStyles;

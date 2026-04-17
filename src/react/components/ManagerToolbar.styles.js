import { StyleSheet, Platform } from 'react-native';

const createStyles = brandColors =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
    },
    wrapper: {
      paddingHorizontal: 12,
      paddingTop: 6,
      backgroundColor: 'transparent',
    },
    toolbarShadow: {
      height: 56,
      borderRadius: 20,
      backgroundColor: '#fff',
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        android: { elevation: 12 },
        web: { boxShadow: '0 -6px 20px rgba(15,23,42,0.12)' },
      }),
    },
    toolbar: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 20,
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
      overflow: 'hidden',
    },
    iconWrapActive: {
      backgroundColor: brandColors.primary,
    },
    label: {
      fontSize: 10,
      fontWeight: '500',
      color: brandColors.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: brandColors.primary,
      fontWeight: '700',
    },
  });

export default createStyles;

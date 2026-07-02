import { Platform, StyleSheet } from 'react-native';

const createStyles = (brandColors, insets) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
    },
    toolbar: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: Math.max(insets?.bottom || 0, 10),
      borderTopWidth: 1,
      borderTopColor: brandColors.border,
      backgroundColor: brandColors.background,
      ...Platform.select({
        ios: {
          shadowColor: brandColors.text,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
        },
        android: { elevation: 10 },
        web: { boxShadow: `0 -6px 20px rgba(15,23,42,0.12)` },
      }),
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 44,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    buttonText: {
      fontSize: 12,
      color: brandColors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
      fontWeight: '600',
    },
    activeText: {
      color: brandColors.primary,
      fontWeight: '800',
    },
  });

export default createStyles;

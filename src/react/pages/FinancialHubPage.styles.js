import {StyleSheet} from 'react-native';

export const createStyles = (palette = {}) =>
  StyleSheet.create({
    container: {flex: 1},
    topBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    tabsRow: {
      flex: 1,
      minWidth: 280,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tabChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
    },
    tabChipText: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.textSecondary,
    },
    entriesContainer: {
      flex: 1,
    },
    centerState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    centerStateTitle: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: '800',
      color: palette.textPrimary,
    },
    centerStateText: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 21,
      color: palette.textSecondary,
      textAlign: 'center',
    },
  });

const styles = createStyles();
export default styles;

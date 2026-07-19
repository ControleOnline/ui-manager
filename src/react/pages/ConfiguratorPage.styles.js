import { Platform, StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const buildCardShadow = palette =>
  Platform.select({
    ios: {
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    web: { boxShadow: `0 10px 24px ${withOpacity(palette.text, 0.08)}` },
  });

export const createStyles = (palette = colors) => {
  const cardShadow = buildCardShadow(palette);

  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingBottom: 32 },
    heroCard: {
      borderRadius: 24,
      padding: 22,
      marginBottom: 20,
      overflow: 'hidden',
      backgroundColor: palette.actionBackground,
      ...cardShadow,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      color: withOpacity(palette.actionText, 0.72),
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    heroTitle: {
      marginTop: 10,
      fontSize: 28,
      fontWeight: '800',
      color: palette.actionText,
      letterSpacing: -0.6,
    },
    heroText: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 22,
      color: withOpacity(palette.actionText, 0.86),
    },
    heroBadge: {
      position: 'absolute',
      top: 18,
      right: 18,
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: palette.actionText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.text,
      marginBottom: 12,
    },
    sectionDescription: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.mutedText,
      marginBottom: 12,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionCard: {
      flexBasis: '48%',
      flexGrow: 1,
      minHeight: 152,
      borderRadius: 18,
      padding: 16,
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      ...cardShadow,
    },
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    actionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionLabel: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.cardText,
      flex: 1,
    },
    actionDescription: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.mutedText,
    },
  });
};

const styles = createStyles(colors);
export default styles;

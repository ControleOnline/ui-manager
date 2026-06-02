import { Platform, StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const buildCardShadow = palette =>
  Platform.select({
    ios: {
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    web: { boxShadow: `0 4px 12px ${withOpacity(palette.text, 0.06)}` },
  });

export const createStyles = (palette = colors) => {
  const cardShadow = buildCardShadow(palette);
  return StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statLoader: { marginVertical: 5 },
  shortcutSpacer: { flex: 1 },

  overviewLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...cardShadow,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: palette.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  actionBanner: {
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
      web: { boxShadow: `0 8px 24px ${withOpacity(palette.info, 0.2)}` },
    }),
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.white,
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 13,
    color: withOpacity(palette.white, 0.8),
  },
  actionArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionBlock: {
    marginBottom: 20,
  },
  sectionBlockLast: {
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.2,
  },

  sectionSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 8,
    marginBottom: 14,
  },
  sectionSummaryItem: {
    backgroundColor: palette.background,
    borderRadius: 10,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  sectionSummaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.textSecondary,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  shortcutsRowLast: {
    marginBottom: 0,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    ...cardShadow,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
    lineHeight: 18,
  },
  });
};

const styles = createStyles(colors);
export default styles;

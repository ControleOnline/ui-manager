import { Platform, StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const buildCardShadow = palette =>
  Platform.select({
    ios: {
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    web: { boxShadow: `0 4px 12px ${withOpacity(palette.text, 0.06)}` },
  });

export const createStyles = (palette = colors) => {
  const cardShadow = buildCardShadow(palette);
  return StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...cardShadow,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: palette.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  createPrinterBtn: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    ...cardShadow,
  },
  createPrinterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.white,
  },
  printerActionBlock: {
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  filtersBlock: {
    marginBottom: 14,
  },
  filtersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  loadingBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  tabList: {
    flex: 1,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listMetaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.text,
  },
  listMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSecondary,
  },
  inlineMessageBox: {
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: withOpacity(palette.error, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(palette.error, 0.3),
  },
  inlineMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.error,
    lineHeight: 18,
  },

  listContent: {
    gap: 10,
    flexGrow: 1,
    paddingBottom: 24,
  },
  listContentEmpty: {
    justifyContent: 'center',
  },
  listFooterLoader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 18,
  },

  deviceCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTextWrap: {
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  deviceSub: {
    fontSize: 11,
    color: palette.textSecondary,
    marginTop: 2,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  deviceMetaChip: {
    borderRadius: 999,
    backgroundColor: palette.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deviceMetaChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.textSecondary,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chevronIcon: {
    marginLeft: 8,
  },

  emptyBox: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 32,
    ...cardShadow,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  });
};

const styles = createStyles(colors);
export default styles;

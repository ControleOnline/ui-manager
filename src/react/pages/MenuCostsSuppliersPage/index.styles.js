import { StyleSheet } from 'react-native';
import { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';

export { MENU_COLORS };

export default StyleSheet.create({
  contactList: {
    gap: 8,
    marginTop: 12,
  },
  contactCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.surfaceAlt,
    padding: 12,
    gap: 4,
  },
  contactName: {
    color: MENU_COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  contactMeta: {
    color: MENU_COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  contactBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  contactBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactBadgeText: {
    color: MENU_COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  summaryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MENU_COLORS.border,
    backgroundColor: MENU_COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  summaryChipText: {
    color: MENU_COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
});

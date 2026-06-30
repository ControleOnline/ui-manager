import { StyleSheet } from 'react-native';
import {colors} from '@controleonline/../../src/styles/colors';

const createStyles = (palette = colors) =>
  StyleSheet.create({
  scrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  tabButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSecondary,
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.textSecondary,
  },
});

export default createStyles;

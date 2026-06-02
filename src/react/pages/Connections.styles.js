import { StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';
import { withOpacity } from '@controleonline/../../src/styles/branding';

export const createStyles = (palette = colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  centerStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  centerStateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 16,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: withOpacity(palette.white, 0.82),
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.white,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: withOpacity(palette.white, 0.88),
  },
  heroBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textSecondary,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 21,
    fontWeight: '800',
    color: palette.text,
  },
  companyBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: withOpacity(palette.info, 0.12),
  },
  companyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.info,
  },
  channelCard: {
    borderRadius: 28,
    backgroundColor: palette.white,
    padding: 18,
  },
  channelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  channelIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelStatusPill: {
    borderRadius: 999,
    backgroundColor: palette.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  channelStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textSecondary,
  },
  channelTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 8,
  },
  channelDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSecondary,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: palette.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSecondary,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  previewList: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    backgroundColor: palette.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  previewPhone: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  previewStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.info,
  },
  emptyInline: {
    borderRadius: 18,
    backgroundColor: palette.background,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyInlineText: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSecondary,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.text,
  },
});

const styles = createStyles(colors);
export default styles;

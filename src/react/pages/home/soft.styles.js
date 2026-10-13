export default function softStyles(palette, width) {
  const mobile = width < 700;
  return {
    scroll: {paddingHorizontal: mobile ? 16 : 24, paddingTop: mobile ? 18 : 24,
      paddingBottom: 24, width: '100%', maxWidth: 1600, alignSelf: 'center'},
    overviewLabel: {fontSize: 16, marginBottom: 12, color: palette.text},
    statsRow: {flexDirection: 'row', gap: mobile ? 8 : 12, marginBottom: 20},
    statCard: {flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
      justifyContent: mobile ? 'center' : 'flex-start', alignContent: 'center',
      gap: 8, padding: mobile ? 14 : 20,
      minHeight: 88, borderRadius: 14, borderWidth: 1,
      borderColor: palette.cardBorder, backgroundColor: palette.cardBackground},
    statIcon: {width: 32, height: 32, borderRadius: 10, marginBottom: 0,
      backgroundColor: palette.cardIconBackground, alignItems: 'center', justifyContent: 'center'},
    statValue: {fontSize: 20, color: palette.text, fontWeight: '700', marginBottom: 0},
    statLabel: {fontSize: 12, color: palette.mutedText, fontWeight: '600'},
    actionBanner: {marginBottom: 24, borderRadius: 14, borderWidth: 1,
      borderLeftWidth: 4, borderColor: palette.cardBorder,
      borderLeftColor: palette.homeAccent, backgroundColor: palette.cardBackground},
    actionContent: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: mobile ? 16 : 20, gap: 12},
    actionTitle: {fontSize: 16, fontWeight: '600', color: palette.text, marginBottom: 4},
    actionSub: {fontSize: 12, color: palette.mutedText},
  };
}

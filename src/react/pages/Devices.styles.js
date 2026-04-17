import { Platform, StyleSheet } from 'react-native';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const styles = StyleSheet.create({
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
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...cardShadow,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 18,
  },

  loadingBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  listContent: {
    gap: 10,
    paddingBottom: 24,
  },

  deviceCard: {
    backgroundColor: '#fff',
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
    color: '#0F172A',
  },
  deviceSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
    backgroundColor: '#fff',
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
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default styles;

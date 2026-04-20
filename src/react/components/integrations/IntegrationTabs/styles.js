import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  tabButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    color: '#475569',
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
});

export default styles;

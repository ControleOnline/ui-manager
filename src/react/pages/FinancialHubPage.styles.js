import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {flex: 1},
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  subtleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subtleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabsRow: {
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
    backgroundColor: '#FFFFFF',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  contentBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#0F172A',
  },
  centerStateText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default styles;

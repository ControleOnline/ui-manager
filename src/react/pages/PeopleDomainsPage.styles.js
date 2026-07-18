import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
    gap: 12,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  deniedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  deniedTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  deniedText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
});

import { StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  centerStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  pageHeader: {
    gap: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    maxWidth: 760,
  },
  integrationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  integrationCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 220,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  integrationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  integrationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationLogo: {
    width: 24,
    height: 24,
  },
  integrationStatus: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  integrationStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  integrationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default styles;

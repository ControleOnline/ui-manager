import {Platform, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    maxHeight: '88%',
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#075985',
  },
  paper: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  receiptWrap: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 96,
    height: 40,
  },
  cutLine: {
    marginVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  cutText: {
    marginTop: -9,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  receiptText: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
    lineHeight: 17,
    color: '#0F172A',
  },
  receiptTextCenter: {
    textAlign: 'center',
  },
  receiptTextBold: {
    fontWeight: '800',
  },
  receiptTextLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  receiptTextReverse: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 3,
  },
  receiptTextReverseCenter: {
    alignSelf: 'stretch',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  stateBox: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    padding: 14,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
});

export default styles;

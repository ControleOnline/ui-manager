import { Platform, StyleSheet } from 'react-native';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const cardShadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#0EA5E9',
  purple:  '#8B5CF6',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },

  /* Cabeçalho do device */
  deviceHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...cardShadow,
  },
  deviceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  deviceIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aliasBlock:  { flex: 1, minWidth: 0 },
  aliasRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  aliasInput: {
    flex: 1,
    fontSize: 15, fontWeight: '700', color: '#0F172A',
    borderBottomWidth: 1.5, borderBottomColor: '#0EA5E9',
    paddingVertical: 2, paddingHorizontal: 0,
    outlineStyle: 'none',
  },
  editAliasBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  deviceAlias:       { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
  deviceString:      { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  deviceHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Loading */
  loadingBox:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  /* Abas */
  tabsBar: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 6,
    ...cardShadow,
  },
  tabsContent: {
    gap: 6,
  },
  tabButton: {
    minWidth: 126,
    minHeight: 42,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },

  /* Resumo */
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 12, ...cardShadow,
  },
  summaryIcon:  { marginBottom: 6 },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: 0.3, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  /* Seção */
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#334155',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...cardShadow,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  configDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  configHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  configButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  configButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleRowActive: {
    borderColor: withOpacity(hex.success, 0.4),
    backgroundColor: withOpacity(hex.success, 0.08),
  },
  toggleRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRowValue: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  textInputWrap: {
    gap: 6,
  },
  textInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    outlineStyle: 'none',
  },

  /* Carteiras / pagamentos */
  walletCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    gap: 8, ...cardShadow,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletName:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  walletTotal:  { fontSize: 15, fontWeight: '800' },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  paymentIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  paymentName:    { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  paymentValue:   { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Tabela de produtos */
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  tableContainer: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...cardShadow,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tableHead: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 },
  productRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, alignItems: 'flex-start' },
  productRowAlt: { backgroundColor: '#F8FAFC' },
  productCell:   { fontSize: 12, color: '#334155', fontWeight: '500' },
  productName:   { fontSize: 12, color: '#334155', fontWeight: '600' },
  productSku:    { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  tableFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tableFooterLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  tableFooterValue: { fontSize: 17, fontWeight: '900' },

  /* Vazio */
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 28,
    alignItems: 'center', ...cardShadow,
  },
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});

export default styles;

export const inlineStyle_667_12 = {
  flex: 3,
};

export const inlineStyle_1301_61 = {
  marginBottom: 8,
};

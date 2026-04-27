import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },

  iconButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  iconButtonCompact: {
    width: 36,
  },

  iconButtonExpanded: {
    maxWidth: 220,
    paddingHorizontal: 10,
  },

  iconButtonStatic: {
    backgroundColor: '#F8FAFC',
  },

  iconHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    width: '100%',
    maxWidth: 220,
  },

  iconCompanyLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },

  iconCompanyName: {
    maxWidth: 150,
    fontSize: 13,
    fontWeight: '700',
  },

  iconChevron: {
    marginTop: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },

  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  companyLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
    marginTop: 2,
  },

  companyName: {
    fontSize: 14,
    fontWeight: '500',
  },

  avatarWrap: {
    width: 40,
    height: 40,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  companyItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  companyItemSelected: {
    backgroundColor: '#f8fafc',
  },

  companyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  companyItemName: {
    marginLeft: 10,
    fontSize: 15,
  },
});

export default styles;

export const inlineStyle_275_20 = {
  marginLeft: 4,
  marginTop: 4,
};

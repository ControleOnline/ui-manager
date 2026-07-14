import { StyleSheet } from 'react-native';

const createStyles = (palette = {}) =>
  StyleSheet.create({
  container: {
    backgroundColor: palette.pageBackground,
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
    maxWidth: '100%',
    flexShrink: 1,
  },

  iconButtonCompact: {
    width: 36,
  },

  iconButtonExpanded: {
    maxWidth: '100%',
    paddingHorizontal: 10,
  },

  iconButtonStatic: {
    backgroundColor: palette.pageBackground,
  },

  iconHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },

  iconCompanyLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },

  iconCompanyName: {
    color: palette.headerText,
    flexShrink: 1,
    minWidth: 0,
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
    color: palette.headerText,
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
    color: palette.headerText,
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

  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.modalOverlay,
  },

  modalContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 400,
    maxHeight: 400,
    backgroundColor: palette.modalBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.modalBorder,
  },

  modalTitle: {
    color: palette.modalHeaderText,
    fontSize: 18,
    fontWeight: '600',
  },

  companyItem: {
    backgroundColor: palette.listItemBackground,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: palette.listItemBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  companyItemSelected: {
    backgroundColor: palette.listItemSelectedBackground,
    borderBottomColor: palette.listItemSelectedBorder,
  },

  companyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  companyItemName: {
    color: palette.listItemText,
    marginLeft: 10,
    fontSize: 15,
  },
});

export default createStyles;

export const inlineStyle_275_20 = {
  marginLeft: 4,
  marginTop: 4,
};

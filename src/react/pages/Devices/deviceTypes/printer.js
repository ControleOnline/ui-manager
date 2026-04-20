import {getNetworkDeviceProfile} from '@controleonline/ui-common/src/react/utils/networkDeviceProfiles';
import {
  isPrinterDeviceType,
  normalizeDeviceType,
  PRINT_DEVICE_TYPE,
  PRINTER_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {createDeviceTypeTab} from './shared';

const printerProfile = getNetworkDeviceProfile('PRINT');
const emptyState = {
  icon: printerProfile.icon,
  title: printerProfile.emptyTitle,
  description: printerProfile.emptyDescription,
};

const printerDeviceType = {
  key: printerProfile.filterKey,
  label: printerProfile.filterLabel,
  itemLabel: printerProfile.itemLabel,
  icon: printerProfile.icon,
  matches: type => isPrinterDeviceType(normalizeDeviceType(type)),
  shouldDisplay: () => true,
  getAccent: ({brandColors, hex}) => brandColors?.primary || hex.primary,
  getEmptyState: () => emptyState,
  detailRouteName: printerProfile.detailRouteName,
  createRouteName: printerProfile.formRouteName,
  createActionLabel: printerProfile.createActionLabel,
  createHelperText: printerProfile.createHelperText,
  TabComponent: createDeviceTypeTab({
    label: printerProfile.filterLabel,
    queryTypes: [PRINT_DEVICE_TYPE, PRINTER_DEVICE_TYPE],
    emptyState,
  }),
};

export default printerDeviceType;

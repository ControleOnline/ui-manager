import {getNetworkDeviceProfile} from '@controleonline/ui-common/src/react/utils/networkDeviceProfiles';
import {
  IP_CAMERA_DEVICE_TYPE,
  normalizeDeviceType,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {createDeviceTypeTab} from './shared';

const ipCameraProfile = getNetworkDeviceProfile(IP_CAMERA_DEVICE_TYPE);
const emptyState = {
  icon: ipCameraProfile.icon,
  title: ipCameraProfile.emptyTitle,
  description: ipCameraProfile.emptyDescription,
};

const ipCameraDeviceType = {
  key: ipCameraProfile.filterKey,
  label: ipCameraProfile.filterLabel,
  itemLabel: ipCameraProfile.itemLabel,
  icon: ipCameraProfile.icon,
  matches: type => normalizeDeviceType(type) === IP_CAMERA_DEVICE_TYPE,
  shouldDisplay: () => true,
  getAccent: ({brandColors, hex}) => brandColors?.primary || hex.primary,
  getEmptyState: () => emptyState,
  detailRouteName: ipCameraProfile.detailRouteName,
  createRouteName: ipCameraProfile.formRouteName,
  createActionLabel: ipCameraProfile.createActionLabel,
  createHelperText: ipCameraProfile.createHelperText,
  TabComponent: createDeviceTypeTab({
    label: ipCameraProfile.filterLabel,
    queryTypes: [IP_CAMERA_DEVICE_TYPE],
    emptyState,
  }),
};

export default ipCameraDeviceType;

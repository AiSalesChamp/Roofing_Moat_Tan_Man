import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  ALL_CALL_LOGS_VIEW_ID,
  CALL_LOGS_NAV_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: CALL_LOGS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Call Logs',
  icon: 'IconPhoneCall',
  position: 5,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: ALL_CALL_LOGS_VIEW_ID,
});

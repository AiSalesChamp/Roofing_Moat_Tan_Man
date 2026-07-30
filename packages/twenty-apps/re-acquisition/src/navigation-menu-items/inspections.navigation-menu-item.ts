import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  INSPECTIONS_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  ALL_INSPECTIONS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: INSPECTIONS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Inspections',
  icon: 'IconClipboardCheck',
  position: 11,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: ALL_INSPECTIONS_VIEW_ID,
});

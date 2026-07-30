import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  OPEN_TASKS_NAV_ID,
  OPEN_TASKS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: OPEN_TASKS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Open Tasks',
  icon: 'IconCheckbox',
  position: 4,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: OPEN_TASKS_VIEW_ID,
});

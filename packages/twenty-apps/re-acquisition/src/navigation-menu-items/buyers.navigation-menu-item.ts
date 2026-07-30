import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  BUYERS_NAV_ID,
  CONTACTS_FOLDER_NAV_ID,
  BUYERS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: BUYERS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Buyers List',
  icon: 'IconUsers',
  position: 1,
  folderUniversalIdentifier: CONTACTS_FOLDER_NAV_ID,
  viewUniversalIdentifier: BUYERS_VIEW_ID,
});

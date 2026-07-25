import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  SELLERS_NAV_ID,
  CONTACTS_FOLDER_NAV_ID,
  SELLERS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: SELLERS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Sellers',
  icon: 'IconUser',
  position: 0,
  folderUniversalIdentifier: CONTACTS_FOLDER_NAV_ID,
  viewUniversalIdentifier: SELLERS_VIEW_ID,
});

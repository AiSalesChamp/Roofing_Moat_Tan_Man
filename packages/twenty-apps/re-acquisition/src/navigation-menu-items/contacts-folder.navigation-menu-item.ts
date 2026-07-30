import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  CONTACTS_FOLDER_NAV_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: CONTACTS_FOLDER_NAV_ID,
  type: NavigationMenuItemType.FOLDER,
  name: 'Contacts',
  icon: 'IconUsers',
  position: 1,
});

import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  TITLE_ESCROW_NAV_ID,
  CONTACTS_FOLDER_NAV_ID,
  TITLE_ESCROW_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: TITLE_ESCROW_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Title / Escrow',
  icon: 'IconStamp',
  position: 2,
  folderUniversalIdentifier: CONTACTS_FOLDER_NAV_ID,
  viewUniversalIdentifier: TITLE_ESCROW_VIEW_ID,
});

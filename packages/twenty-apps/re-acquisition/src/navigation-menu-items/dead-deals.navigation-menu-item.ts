import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  DEAD_DEALS_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  DEAD_DEALS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DEAD_DEALS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Dead Deals',
  icon: 'IconSkull',
  position: 4,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: DEAD_DEALS_VIEW_ID,
});

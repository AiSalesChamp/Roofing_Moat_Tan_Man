import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  LAND_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  LAND_DEALS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: LAND_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Land Deals',
  icon: 'IconTrees',
  position: 7,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: LAND_DEALS_VIEW_ID,
});

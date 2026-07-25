import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ALL_DEALS_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  ALL_DEALS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: ALL_DEALS_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'All Deals',
  icon: 'IconTargetArrow',
  position: 1,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: ALL_DEALS_VIEW_ID,
});

import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  COMMERCIAL_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  COMMERCIAL_DEALS_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: COMMERCIAL_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Commercial / Industrial',
  icon: 'IconBuildingFactory2',
  position: 9,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: COMMERCIAL_DEALS_VIEW_ID,
});

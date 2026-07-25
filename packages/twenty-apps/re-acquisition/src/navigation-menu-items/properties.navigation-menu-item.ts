import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  PROPERTIES_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  ALL_PROPERTIES_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: PROPERTIES_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Properties',
  icon: 'IconBuildingSkyscraper',
  position: 2,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: ALL_PROPERTIES_VIEW_ID,
});

import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  type: NavigationMenuItemType.FOLDER,
  name: 'Acquisition',
  icon: 'IconBuildingSkyscraper',
  position: 0,
});

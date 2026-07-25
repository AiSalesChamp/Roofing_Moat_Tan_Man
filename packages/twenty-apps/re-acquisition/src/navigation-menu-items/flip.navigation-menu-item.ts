import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  FLIP_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  FLIP_ACTIVE_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FLIP_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Flip Active',
  icon: 'IconHammer',
  position: 6,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: FLIP_ACTIVE_VIEW_ID,
});

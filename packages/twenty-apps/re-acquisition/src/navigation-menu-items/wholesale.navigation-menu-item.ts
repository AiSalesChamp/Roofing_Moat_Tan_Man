import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  WHOLESALE_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  WHOLESALE_QUEUE_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: WHOLESALE_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Wholesale Queue',
  icon: 'IconArrowsExchange',
  position: 5,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: WHOLESALE_QUEUE_VIEW_ID,
});

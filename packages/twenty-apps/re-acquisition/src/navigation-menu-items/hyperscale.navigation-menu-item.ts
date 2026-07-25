import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  HYPERSCALE_NAV_ID,
  HYPERSCALE_QUEUE_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: HYPERSCALE_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Hyperscale Queue',
  icon: 'IconBolt',
  position: 10,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: HYPERSCALE_QUEUE_VIEW_ID,
});

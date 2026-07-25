import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  PIPELINE_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  ACQUISITION_PIPELINE_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: PIPELINE_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Pipeline',
  icon: 'IconLayoutKanban',
  position: 0,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: ACQUISITION_PIPELINE_VIEW_ID,
});

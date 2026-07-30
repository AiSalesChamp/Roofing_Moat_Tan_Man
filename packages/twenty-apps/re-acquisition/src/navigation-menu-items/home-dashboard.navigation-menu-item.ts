import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  HOME_DASHBOARD_NAV_ID,
  HOME_DASHBOARD_PAGE_LAYOUT_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: HOME_DASHBOARD_NAV_ID,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  name: 'Dashboard',
  icon: 'IconHome',
  position: 0,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  pageLayoutUniversalIdentifier: HOME_DASHBOARD_PAGE_LAYOUT_ID,
});

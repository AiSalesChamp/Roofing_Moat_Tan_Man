import {
  NavigationMenuItemType,
  defineNavigationMenuItem,
} from 'twenty-sdk/define';

import {
  ACQUISITION_DASHBOARD_PAGE_ID,
  ACQUISITION_FOLDER_NAV_ID,
  DASHBOARD_NAV_ID,
} from 'src/constants/universal-identifiers';

// Position -1 so the dashboard sits above Pipeline (position 0) without
// renumbering every sibling.
export default defineNavigationMenuItem({
  universalIdentifier: DASHBOARD_NAV_ID,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  name: 'Dashboard',
  icon: 'IconLayoutDashboard',
  position: -1,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  pageLayoutUniversalIdentifier: ACQUISITION_DASHBOARD_PAGE_ID,
});

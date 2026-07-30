import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  KPI_DASHBOARD_NAV_ID,
  KPI_DASHBOARD_PAGE_LAYOUT_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: KPI_DASHBOARD_NAV_ID,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  name: 'Reports / KPIs',
  icon: 'IconChartInfographic',
  position: 13,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  pageLayoutUniversalIdentifier: KPI_DASHBOARD_PAGE_LAYOUT_ID,
});

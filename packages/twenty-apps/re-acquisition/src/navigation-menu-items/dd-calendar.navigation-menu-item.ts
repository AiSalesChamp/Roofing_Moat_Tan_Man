import { NavigationMenuItemType, defineNavigationMenuItem } from 'twenty-sdk/define';

import {
  DD_CALENDAR_NAV_ID,
  ACQUISITION_FOLDER_NAV_ID,
  DD_CALENDAR_VIEW_ID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DD_CALENDAR_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'DD Calendar',
  icon: 'IconCalendarEvent',
  position: 9,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: DD_CALENDAR_VIEW_ID,
});

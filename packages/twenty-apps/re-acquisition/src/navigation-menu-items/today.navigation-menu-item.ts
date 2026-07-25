import {
  NavigationMenuItemType,
  defineNavigationMenuItem,
} from 'twenty-sdk/define';

import {
  ACQUISITION_FOLDER_NAV_ID,
  TODAY_NAV_ID,
  TODAY_VIEW_ID,
} from 'src/constants/universal-identifiers';

// Position -2 puts the queue above Dashboard (-1) and Pipeline (0). The SDK
// exposes no way to set a workspace landing page, so top-of-folder is as close
// to a default as an app can get — see the note in the summary.
export default defineNavigationMenuItem({
  universalIdentifier: TODAY_NAV_ID,
  type: NavigationMenuItemType.VIEW,
  name: 'Today',
  icon: 'IconSunHigh',
  position: -2,
  folderUniversalIdentifier: ACQUISITION_FOLDER_NAV_ID,
  viewUniversalIdentifier: TODAY_VIEW_ID,
});

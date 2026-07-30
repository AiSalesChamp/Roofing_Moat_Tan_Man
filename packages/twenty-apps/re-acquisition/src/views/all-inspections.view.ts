import {
  ALL_INSPECTIONS_VIEW_ID,
  INSPECTION_CONDITION_FIELD_ID,
  INSPECTION_DATE_FIELD_ID,
  INSPECTION_PROPERTY_FIELD_ID,
  INSPECTION_TYPE_FIELD_ID,
  PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { ViewType, defineView } from 'twenty-sdk/define';

export default defineView({
  universalIdentifier: ALL_INSPECTIONS_VIEW_ID,
  name: 'All Inspections',
  icon: 'IconClipboardCheck',
  objectUniversalIdentifier: PROPERTY_INSPECTION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  fields: [
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000001', fieldMetadataUniversalIdentifier: INSPECTION_TYPE_FIELD_ID, position: 0, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000002', fieldMetadataUniversalIdentifier: INSPECTION_DATE_FIELD_ID, position: 1, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000003', fieldMetadataUniversalIdentifier: INSPECTION_PROPERTY_FIELD_ID, position: 2, isVisible: true },
    { universalIdentifier: 'v1000030-0001-4000-8000-000000000004', fieldMetadataUniversalIdentifier: INSPECTION_CONDITION_FIELD_ID, position: 3, isVisible: true },
  ],
});

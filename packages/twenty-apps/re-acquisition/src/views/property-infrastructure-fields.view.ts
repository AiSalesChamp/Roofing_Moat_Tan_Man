import {
  INFRA_SIGNALS_ON_PROPERTY_FIELD_ID,
  PROPERTY_INFRASTRUCTURE_FIELDS_VIEW_ID,
  PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { ViewType, defineView } from 'twenty-sdk/define';

// Backing view for the "Infrastructure Signals" widget on the property record page.
export default defineView({
  universalIdentifier: PROPERTY_INFRASTRUCTURE_FIELDS_VIEW_ID,
  name: 'Property Infrastructure Fields',
  icon: 'IconBolt',
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'a1000042-0006-4000-8000-000000000001', fieldMetadataUniversalIdentifier: INFRA_SIGNALS_ON_PROPERTY_FIELD_ID, position: 0, isVisible: true },
  ],
});

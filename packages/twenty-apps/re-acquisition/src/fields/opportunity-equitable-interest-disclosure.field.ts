import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

import { OPPORTUNITY_EQUITABLE_INTEREST_DISCLOSURE_FIELD_ID } from 'src/constants/lead-engine-identifiers';

// Texas Occupations Code §1101.0045: when a person sells or assigns an option or
// interest in a contract to purchase real property, they must disclose in WRITING to
// both the prospective buyer and the seller that they are selling only their
// equitable interest and not the property itself.
//
// This is RICH_TEXT rather than a boolean because "we disclosed" is not the
// compliance artifact — the disclosure text itself is. A checkbox proves nothing
// after the fact.
//
// Enforcement lives in the dealStage guard (see logic-functions/on-deal-stage-change):
// an opportunity cannot advance to UNDER_CONTRACT with this empty. The field is
// nullable at the schema level because a SOURCED lead legitimately has no disclosure
// yet — the gate is a stage transition, not a column constraint.
export default defineField({
  universalIdentifier: OPPORTUNITY_EQUITABLE_INTEREST_DISCLOSURE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RICH_TEXT,
  name: 'equitableInterestDisclosure',
  label: 'Equitable Interest Disclosure',
  icon: 'IconFileCertificate',
  isNullable: true,
});

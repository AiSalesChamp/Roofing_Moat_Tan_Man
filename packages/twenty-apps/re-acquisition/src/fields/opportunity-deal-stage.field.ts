import {
  DEAL_STAGE_FIELD_ID,
  DEAL_STAGES,
  DEAL_TYPE_FIELD_ID,
} from 'src/constants/universal-identifiers';
import {
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  defineField,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: DEAL_STAGE_FIELD_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.SELECT,
  name: 'dealStage',
  label: 'Deal Stage',
  icon: 'IconProgressCheck',
  isNullable: false,
  defaultValue: "'SOURCED'",
  options: DEAL_STAGES.map((stage, index) => ({
    id: `e1000001-0001-4000-8000-${String(index).padStart(12, '0')}`,
    value: stage.value,
    label: stage.label,
    position: stage.position,
    color: stage.color,
  })),
});

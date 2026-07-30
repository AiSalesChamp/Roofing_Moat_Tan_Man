import { ZONING_TRAJECTORY_FIELD_ID } from 'src/constants/underwriting-identifiers';
import { PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FieldType, defineField } from 'twenty-sdk/define';

export default defineField({
  universalIdentifier: ZONING_TRAJECTORY_FIELD_ID,
  objectUniversalIdentifier: PROPERTY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.SELECT,
  name: 'zoningTrajectory',
  label: 'Zoning Trajectory',
  icon: 'IconTrendingUp',
  isNullable: true,
  options: [
    { id: 'f1000093-0002-4000-8000-000000000001', value: 'UPZONING_LIKELY', label: 'Upzoning Likely', position: 0, color: 'green' },
    { id: 'f1000093-0002-4000-8000-000000000002', value: 'STABLE', label: 'Stable', position: 1, color: 'blue' },
    { id: 'f1000093-0002-4000-8000-000000000003', value: 'DOWNZONING_RISK', label: 'Downzoning Risk', position: 2, color: 'red' },
    { id: 'f1000093-0002-4000-8000-000000000004', value: 'UNKNOWN', label: 'Unknown', position: 3, color: 'gray' },
  ],
});

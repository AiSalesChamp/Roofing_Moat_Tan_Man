import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  COMP_PRICE_PER_ACRE_FIELD_ID,
  COMP_PRICE_PER_SQFT_FIELD_ID,
  COMP_SALE_DATE_FIELD_ID,
  COMP_SALE_PRICE_FIELD_ID,
  COMP_SOURCE_FIELD_ID,
  COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  COMP_ACREAGE_FIELD_ID,
  COMP_BUILDABILITY_RATING_FIELD_ID,
  COMP_POWER_FIBER_ADJACENT_FIELD_ID,
  COMP_QUALITY_RATINGS,
  COMP_ROAD_ACCESS_RATING_FIELD_ID,
} from 'src/constants/underwriting-identifiers';

export default defineObject({
  universalIdentifier: COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'comparableSale',
  namePlural: 'comparableSales',
  labelSingular: 'Comparable Sale',
  labelPlural: 'Comparable Sales',
  description: 'Comparable sale for underwriting',
  icon: 'IconChartBar',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: COMP_SALE_PRICE_FIELD_ID,
  fields: [
    {
      universalIdentifier: COMP_SALE_PRICE_FIELD_ID,
      type: FieldType.CURRENCY,
      name: 'salePrice',
      label: 'Sale Price',
      icon: 'IconCoin',
      isNullable: true,
    },
    {
      universalIdentifier: COMP_SALE_DATE_FIELD_ID,
      type: FieldType.DATE,
      name: 'saleDate',
      label: 'Sale Date',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: COMP_PRICE_PER_ACRE_FIELD_ID,
      type: FieldType.CURRENCY,
      name: 'pricePerAcre',
      label: 'Price Per Acre',
      icon: 'IconRulerMeasure',
      isNullable: true,
    },
    {
      universalIdentifier: COMP_PRICE_PER_SQFT_FIELD_ID,
      type: FieldType.CURRENCY,
      name: 'pricePerSqFt',
      label: 'Price Per Sq Ft',
      icon: 'IconDimensions',
      isNullable: true,
    },
    {
      universalIdentifier: COMP_SOURCE_FIELD_ID,
      type: FieldType.TEXT,
      name: 'source',
      label: 'Source',
      icon: 'IconLink',
      isNullable: true,
    },
    {
      // CAD rolls publish acreage to four decimal places.
      universalIdentifier: COMP_ACREAGE_FIELD_ID,
      type: FieldType.NUMBER,
      name: 'acreage',
      label: 'Acreage',
      icon: 'IconRulerMeasure',
      isNullable: true,
      universalSettings: { decimals: 4 },
    },
    {
      universalIdentifier: COMP_ROAD_ACCESS_RATING_FIELD_ID,
      type: FieldType.SELECT,
      name: 'roadAccessRating',
      label: 'Road Access',
      icon: 'IconRoad',
      isNullable: true,
      options: COMP_QUALITY_RATINGS.map((option) => ({
        id: `f1000094-0002-4000-8000-00000000000${option.position + 1}`,
        ...option,
      })),
    },
    {
      universalIdentifier: COMP_BUILDABILITY_RATING_FIELD_ID,
      type: FieldType.SELECT,
      name: 'buildabilityRating',
      label: 'Buildability',
      icon: 'IconBuildingFactory2',
      isNullable: true,
      options: COMP_QUALITY_RATINGS.map((option) => ({
        id: `f1000094-0003-4000-8000-00000000000${option.position + 1}`,
        ...option,
      })),
    },
    {
      universalIdentifier: COMP_POWER_FIBER_ADJACENT_FIELD_ID,
      type: FieldType.BOOLEAN,
      name: 'isPowerFiberAdjacent',
      label: 'Power/Fiber Adjacent',
      icon: 'IconBolt',
      isNullable: true,
    },
  ],
});

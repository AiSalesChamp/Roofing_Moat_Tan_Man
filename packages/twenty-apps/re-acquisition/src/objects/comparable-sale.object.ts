import { FieldType, defineObject } from 'twenty-sdk/define';

import {
  COMP_PRICE_PER_ACRE_FIELD_ID,
  COMP_PRICE_PER_SQFT_FIELD_ID,
  COMP_SALE_DATE_FIELD_ID,
  COMP_SALE_PRICE_FIELD_ID,
  COMP_SOURCE_FIELD_ID,
  COMPARABLE_SALE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

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
  ],
});

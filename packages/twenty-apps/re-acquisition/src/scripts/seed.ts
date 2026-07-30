// Idempotent seed for RE Acquisition demo data.
// Run from packages/twenty-apps/re-acquisition with app published:
//   yarn twenty dev --once
//   yarn seed

import { config } from 'dotenv';
config({ path: process.env.ENV_FILE ?? '.env.local' });

import { CoreApiClient } from 'twenty-client-sdk/core';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var`);
  return value;
};

const toMicros = (dollars: number) => Math.round(dollars * 1_000_000);

type PropertySeed = {
  key: string;
  address: {
    addressStreet1: string;
    addressCity: string;
    addressState: string;
    addressPostcode: string;
    addressCountry: string;
  };
  apn: string;
  county: string;
  propertyClass: string;
  acreage?: number;
  buildingSqFt?: number;
  zoning?: string;
};

type PersonSeed = {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactRole: string[];
  buyerMarkets?: string[];
};

type DealSeed = {
  key: string;
  name: string;
  propertyKey: string;
  sellerKey?: string;
  dealStage: string;
  dealType: string[];
  leadSource?: string;
  motivation?: string[];
  contractPrice?: number;
  arv?: number;
  rehabEstimate?: number;
  projectedProfit?: number;
  askingPrice?: number;
};

const PROPERTIES: PropertySeed[] = [
  {
    key: 'land-phoenix',
    address: {
      addressStreet1: '4820 N Cave Creek Rd',
      addressCity: 'Phoenix',
      addressState: 'AZ',
      addressPostcode: '85018',
      addressCountry: 'United States',
    },
    apn: '123-45-678A',
    county: 'Maricopa',
    propertyClass: 'LAND',
    acreage: 5.2,
    zoning: 'R-43',
  },
  {
    key: 'comm-dallas',
    address: {
      addressStreet1: '1200 Industrial Blvd',
      addressCity: 'Dallas',
      addressState: 'TX',
      addressPostcode: '75207',
      addressCountry: 'United States',
    },
    apn: 'R123456789',
    county: 'Dallas',
    propertyClass: 'COMMERCIAL',
    buildingSqFt: 45000,
    zoning: 'LI',
  },
  {
    key: 'ind-atlanta',
    address: {
      addressStreet1: '890 Logistics Way',
      addressCity: 'Atlanta',
      addressState: 'GA',
      addressPostcode: '30349',
      addressCountry: 'United States',
    },
    apn: '14F-0123-0045',
    county: 'Fulton',
    propertyClass: 'INDUSTRIAL',
    buildingSqFt: 120000,
    acreage: 8.5,
    zoning: 'M-2',
  },
  {
    key: 'land-dead',
    address: {
      addressStreet1: '0 Vacant Parcel Rd',
      addressCity: 'Tucson',
      addressState: 'AZ',
      addressPostcode: '85701',
      addressCountry: 'United States',
    },
    apn: '999-99-999Z',
    county: 'Pima',
    propertyClass: 'LAND',
    acreage: 1.0,
  },
];

const PERSONS: PersonSeed[] = [
  {
    key: 'seller-martinez',
    firstName: 'Carlos',
    lastName: 'Martinez',
    email: 'carlos.martinez@example.com',
    phone: '+16025550101',
    contactRole: ['SELLER'],
  },
  {
    key: 'seller-chen',
    firstName: 'Lisa',
    lastName: 'Chen',
    email: 'lisa.chen@example.com',
    phone: '+12145550102',
    contactRole: ['SELLER'],
  },
  {
    key: 'buyer-williams',
    firstName: 'James',
    lastName: 'Williams',
    email: 'jwilliams@cashbuyers.example.com',
    phone: '+14045550103',
    contactRole: ['BUYER'],
    buyerMarkets: ['LAND', 'COMMERCIAL'],
  },
  {
    key: 'broker-kim',
    firstName: 'Sarah',
    lastName: 'Kim',
    email: 'sarah@crebrokers.example.com',
    phone: '+16785550104',
    contactRole: ['BROKER'],
  },
];

const DEALS: DealSeed[] = [
  {
    key: 'deal-land-wholesale',
    name: 'Phoenix 5.2ac Land — Wholesale',
    propertyKey: 'land-phoenix',
    sellerKey: 'seller-martinez',
    dealStage: 'DISPOSITION',
    dealType: ['WHOLESALE', 'LAND'],
    leadSource: 'DRIVING_FOR_DOLLARS',
    motivation: ['ESTATE', 'VACANT'],
    contractPrice: 185000,
    projectedProfit: 45000,
    askingPrice: 220000,
  },
  {
    key: 'deal-comm-flip',
    name: 'Dallas Commercial — Flip',
    propertyKey: 'comm-dallas',
    sellerKey: 'seller-chen',
    dealStage: 'ACQUIRED',
    dealType: ['FLIP', 'COMMERCIAL'],
    leadSource: 'LOOPNET',
    motivation: ['TIRED_LANDLORD'],
    contractPrice: 1200000,
    arv: 1650000,
    rehabEstimate: 250000,
    projectedProfit: 200000,
  },
  {
    key: 'deal-industrial-dd',
    name: 'Atlanta Industrial — Due Diligence',
    propertyKey: 'ind-atlanta',
    sellerKey: 'seller-chen',
    dealStage: 'DUE_DILIGENCE',
    dealType: ['COMMERCIAL', 'INDUSTRIAL'],
    leadSource: 'OFF_MARKET',
    motivation: ['RELOCATION'],
    contractPrice: 2800000,
    askingPrice: 3100000,
  },
  {
    key: 'deal-sourced',
    name: 'New Sourced Lead — Cave Creek',
    propertyKey: 'land-phoenix',
    dealStage: 'SOURCED',
    dealType: ['LAND'],
    leadSource: 'COUNTY_RECORDS',
  },
  {
    key: 'deal-offer-out',
    name: 'Dallas LOI Submitted',
    propertyKey: 'comm-dallas',
    sellerKey: 'broker-kim',
    dealStage: 'OFFER_OUT',
    dealType: ['FLIP', 'COMMERCIAL'],
    leadSource: 'REFERRAL',
    offerPrice: 1150000,
    askingPrice: 1300000,
  },
  {
    key: 'deal-dead',
    name: 'Tucson Land — Passed',
    propertyKey: 'land-dead',
    dealStage: 'DEAD',
    dealType: ['LAND', 'WHOLESALE'],
    leadSource: 'DIRECT_MAIL',
    motivation: ['VACANT'],
  },
];

const main = async () => {
  const client = new CoreApiClient({
    url: requireEnv('TWENTY_API_URL'),
    apiKey: requireEnv('TWENTY_API_KEY'),
  });

  const propertyIds: Record<string, string> = {};
  const personIds: Record<string, string> = {};

  for (const p of PROPERTIES) {
    const existing = await client.query({
      properties: {
        __args: { filter: { apn: { eq: p.apn } }, first: 1 },
        edges: { node: { id: true } },
      },
    } as any);

    const found = (existing.properties as any).edges[0]?.node?.id;
    if (found) {
      propertyIds[p.key] = found;
      continue;
    }

    const result = await client.mutation({
      createProperty: {
        __args: {
          data: {
            propertyAddress: p.address,
            apn: p.apn,
            county: p.county,
            propertyClass: p.propertyClass,
            acreage: p.acreage,
            buildingSqFt: p.buildingSqFt,
            zoning: p.zoning,
          },
        },
        id: true,
      },
    } as any);
    propertyIds[p.key] = (result.createProperty as any).id;
  }

  for (const person of PERSONS) {
    const existing = await client.query({
      people: {
        __args: {
          filter: {
            emails: { primaryEmail: { eq: person.email } },
          },
          first: 1,
        },
        edges: { node: { id: true } },
      },
    } as any);

    const found = (existing.people as any).edges[0]?.node?.id;
    if (found) {
      personIds[person.key] = found;
      continue;
    }

    const result = await client.mutation({
      createPerson: {
        __args: {
          data: {
            name: { firstName: person.firstName, lastName: person.lastName },
            emails: { primaryEmail: person.email, additionalEmails: [] },
            phones: {
              primaryPhoneNumber: person.phone.replace('+1', ''),
              primaryPhoneCountryCode: 'US',
              primaryPhoneCallingCode: '+1',
              additionalPhones: null,
            },
            contactRole: person.contactRole,
            buyerMarkets: person.buyerMarkets,
          },
        },
        id: true,
      },
    } as any);
    personIds[person.key] = (result.createPerson as any).id;
  }

  for (const deal of DEALS) {
    const existing = await client.query({
      opportunities: {
        __args: { filter: { name: { eq: deal.name } }, first: 1 },
        edges: { node: { id: true } },
      },
    } as any);

    if ((existing.opportunities as any).edges[0]?.node?.id) continue;

    const property = PROPERTIES.find((p) => p.key === deal.propertyKey)!;

    await client.mutation({
      createOpportunity: {
        __args: {
          data: {
            name: deal.name,
            dealStage: deal.dealStage,
            dealType: deal.dealType,
            leadSource: deal.leadSource,
            motivation: deal.motivation,
            propertyId: propertyIds[deal.propertyKey],
            propertyAddress: property.address,
            pointOfContactId: deal.sellerKey
              ? personIds[deal.sellerKey]
              : undefined,
            askingPrice: deal.askingPrice
              ? { amountMicros: toMicros(deal.askingPrice), currencyCode: 'USD' }
              : undefined,
            contractPrice: deal.contractPrice
              ? { amountMicros: toMicros(deal.contractPrice), currencyCode: 'USD' }
              : undefined,
            arv: deal.arv
              ? { amountMicros: toMicros(deal.arv), currencyCode: 'USD' }
              : undefined,
            rehabEstimate: deal.rehabEstimate
              ? {
                  amountMicros: toMicros(deal.rehabEstimate),
                  currencyCode: 'USD',
                }
              : undefined,
            projectedProfit: deal.projectedProfit
              ? {
                  amountMicros: toMicros(deal.projectedProfit),
                  currencyCode: 'USD',
                }
              : undefined,
          },
        },
        id: true,
      },
    } as any);
  }

  console.log(
    `Seeded ${Object.keys(propertyIds).length} properties, ${Object.keys(personIds).length} contacts, ${DEALS.length} deals`,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

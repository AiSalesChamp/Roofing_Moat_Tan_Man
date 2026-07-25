import { CoreApiClient } from 'twenty-client-sdk/core';

// Shared by every property-side recompute adapter (MAO and suggested offer).
// Extracted so the two never drift on pagination behaviour.

const OPPORTUNITY_PAGE_SIZE = 100;

// Paginated rather than a flat `first: N`: a fixed cap would silently skip
// deals past the cap, leaving their derived fields stale with no error anywhere.
export const fetchOpportunityIdsForProperty = async (
  client: CoreApiClient,
  propertyId: string,
): Promise<string[]> => {
  const opportunityIds: string[] = [];
  let after: string | undefined;

  for (;;) {
    const result = await client.query({
      opportunities: {
        __args: {
          filter: { property: { id: { eq: propertyId } } },
          first: OPPORTUNITY_PAGE_SIZE,
          ...(after ? { after } : {}),
        },
        edges: { cursor: true, node: { id: true } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    } as any);

    const connection = result.opportunities as any;
    const edges = connection?.edges ?? [];

    for (const edge of edges) opportunityIds.push(edge.node.id);

    if (!connection?.pageInfo?.hasNextPage || edges.length === 0) break;

    after = connection.pageInfo.endCursor ?? edges[edges.length - 1]?.cursor;
    if (!after) break;
  }

  return opportunityIds;
};

// Bounded: the deal list is unbounded now that it paginates, and each deal
// costs several mutations. A flat Promise.all would burst the whole parcel
// at the API at once.
export const RECOMPUTE_CONCURRENCY = 4;

export const runBoundedConcurrently = async <TItem>(
  items: TItem[],
  handleItem: (item: TItem) => Promise<boolean>,
): Promise<number> => {
  let nextIndex = 0;
  let succeeded = 0;

  const worker = async () => {
    for (;;) {
      const index = nextIndex++;
      if (index >= items.length) return;

      if (await handleItem(items[index])) succeeded++;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(RECOMPUTE_CONCURRENCY, items.length) }, worker),
  );

  return succeeded;
};

import { useCallback, useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { MAO_COMPARISON_FRONT_COMPONENT_ID } from 'src/constants/universal-identifiers';

// Renders the three exit paths side by side with the gate reason and the
// inputs each MAO was actually derived from. The rollup fields on the deal
// carry only the numbers — the reason a path was rejected, the comp count
// behind it, and the discount applied all live on MaoCalculation, and without
// them a bare number is not something an acquisitions rep can act on.

// Front components render inside Twenty's ThemeProvider on the host document,
// so the theme custom properties resolve here and the panel follows the user's
// light/dark setting. Fallbacks keep it legible if a token is ever renamed.
const t = (token: string, fallback: string) => `var(${token}, ${fallback})`;

const EXIT_PATHS = [
  {
    exitType: 'WHOLESALE_FLIP',
    label: 'Wholesale / Flip',
    formula: 'Fair value x fee % − wholesale fee',
  },
  {
    exitType: 'ENTITLE_HOLD',
    label: 'Entitle & Hold',
    formula: 'Post-entitlement value x risk discount − carry − margin',
  },
  {
    exitType: 'HYPERSCALE_DISPOSITION',
    label: 'Hyperscale Disposition',
    formula: 'Corridor value x interconnection discount − holding',
  },
] as const;

const GATE_STATUS_TAGS: Record<string, { label: string; color: string }> = {
  PASSED: { label: 'Gate passed', color: 'green' },
  HARD_REJECTED: { label: 'Hard rejected', color: 'red' },
  NOT_APPLICABLE: { label: 'No gate', color: 'gray' },
};

type MaoCalculation = {
  exitType: string;
  maoValue: { amountMicros?: number | null } | null;
  version: number | null;
  gateStatus: string | null;
  gateReason: string | null;
  inputsSnapshot: Record<string, unknown> | null;
  computedAt: string | null;
};

type DealSummary = {
  recommendedExitType: string | null;
  maoLastComputedAt: string | null;
  offerPrice: { amountMicros?: number | null } | null;
  contractPrice: { amountMicros?: number | null } | null;
};

type PanelData = {
  deal: DealSummary | null;
  latestByExitType: Record<string, MaoCalculation>;
};

const microsToDollars = (
  currency: { amountMicros?: number | null } | null | undefined,
): number | null => {
  const micros = currency?.amountMicros;

  return typeof micros === 'number' && Number.isFinite(micros)
    ? micros / 1_000_000
    : null;
};

const formatUsd = (dollars: number | null): string =>
  dollars === null
    ? '—'
    : dollars.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });

const formatTimestamp = (value: string | null): string => {
  if (value === null) return 'never';

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? 'never'
    : parsed.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
};

const readNumber = (
  snapshot: Record<string, unknown> | null,
  key: string,
): number | null => {
  const value = snapshot?.[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

// The engine records different inputs per path, so the derivation line is
// assembled from whichever keys that path actually wrote.
const describeInputs = (
  snapshot: Record<string, unknown> | null,
): string | null => {
  if (snapshot === null) return null;

  const parts: string[] = [];

  const usableCompCount = readNumber(snapshot, 'usableCompCount');
  const compCount = readNumber(snapshot, 'compCount');

  if (usableCompCount !== null && compCount !== null) {
    parts.push(`${usableCompCount} of ${compCount} comps usable`);
  } else if (compCount !== null) {
    parts.push(`${compCount} comps`);
  }

  const fairValuePerAcre = readNumber(snapshot, 'fairValuePerAcre');
  if (fairValuePerAcre !== null) {
    parts.push(`${formatUsd(fairValuePerAcre)}/acre`);
  }

  const riskDiscountFactor = readNumber(snapshot, 'riskDiscountFactor');
  if (riskDiscountFactor !== null) {
    parts.push(`${Math.round(riskDiscountFactor * 100)}% risk discount`);
  }

  const wholesaleFeePct = readNumber(snapshot, 'wholesaleFeePct');
  if (wholesaleFeePct !== null) {
    parts.push(`${Math.round(wholesaleFeePct * 100)}% fee basis`);
  }

  if (snapshot.usedFallbackComps === true) {
    parts.push('fell back to non-corridor comps');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
};

const Tag = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      fontSize: t('--t-font-size-xxs', '0.77rem'),
      fontWeight: 500,
      padding: `${t('--t-spacing-1', '4px')} ${t('--t-spacing-2', '8px')}`,
      borderRadius: t('--t-border-radius-sm', '4px'),
      color: t(`--t-tag-text-${color}`, 'inherit'),
      backgroundColor: t(`--t-tag-background-${color}`, 'transparent'),
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
);

const Message = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: t('--t-spacing-6', '24px'),
      fontFamily: t('--t-font-family', 'Inter, sans-serif'),
      fontSize: t('--t-font-size-sm', '0.92rem'),
      color: t('--t-font-color-tertiary', '#999'),
    }}
  >
    {children}
  </div>
);

const ExitPathCard = ({
  label,
  formula,
  calculation,
  isRecommended,
}: {
  label: string;
  formula: string;
  calculation: MaoCalculation | undefined;
  isRecommended: boolean;
}) => {
  const mao = microsToDollars(calculation?.maoValue);
  const gateStatus = calculation?.gateStatus ?? 'NOT_APPLICABLE';
  const gateTag = GATE_STATUS_TAGS[gateStatus] ?? GATE_STATUS_TAGS.NOT_APPLICABLE;
  const isRejected = gateStatus === 'HARD_REJECTED';
  const inputsDescription = describeInputs(calculation?.inputsSnapshot ?? null);

  return (
    <div
      style={{
        flex: '1 1 220px',
        minWidth: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: t('--t-spacing-2', '8px'),
        padding: t('--t-spacing-4', '16px'),
        borderRadius: t('--t-border-radius-md', '8px'),
        border: `1px solid ${
          isRecommended
            ? t('--t-accent-accent3570', '#3b82f6')
            : t('--t-border-color-medium', '#e5e5e5')
        }`,
        backgroundColor: isRecommended
          ? t('--t-accent-quaternary', 'transparent')
          : t('--t-background-secondary', 'transparent'),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t('--t-spacing-2', '8px'),
        }}
      >
        <span
          style={{
            fontSize: t('--t-font-size-sm', '0.92rem'),
            fontWeight: 600,
            color: t('--t-font-color-primary', '#111'),
          }}
        >
          {label}
        </span>
        {isRecommended && <Tag label="Recommended" color="green" />}
      </div>

      <span
        style={{
          fontSize: t('--t-font-size-xl', '1.5rem'),
          fontWeight: 600,
          lineHeight: 1.2,
          // A rejected path still shows its last number, but muted — it is
          // history, not an offer anyone should make.
          color: isRejected
            ? t('--t-font-color-light', '#aaa')
            : t('--t-font-color-primary', '#111'),
          textDecoration: isRejected ? 'line-through' : 'none',
        }}
      >
        {formatUsd(mao)}
      </span>

      <div>
        <Tag label={gateTag.label} color={gateTag.color} />
      </div>

      {calculation?.gateReason && (
        <span
          style={{
            fontSize: t('--t-font-size-xs', '0.85rem'),
            color: isRejected
              ? t('--t-font-color-danger', '#c0392b')
              : t('--t-font-color-secondary', '#666'),
          }}
        >
          {calculation.gateReason}
        </span>
      )}

      <span
        style={{
          fontSize: t('--t-font-size-xs', '0.85rem'),
          color: t('--t-font-color-tertiary', '#999'),
        }}
      >
        {inputsDescription ?? formula}
      </span>

      <span
        style={{
          marginTop: 'auto',
          paddingTop: t('--t-spacing-2', '8px'),
          fontSize: t('--t-font-size-xxs', '0.77rem'),
          color: t('--t-font-color-light', '#aaa'),
        }}
      >
        {calculation
          ? `v${calculation.version ?? 1} · ${formatTimestamp(calculation.computedAt)}`
          : 'not computed yet'}
      </span>
    </div>
  );
};

const MaoComparisonPanel = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const opportunityId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaoCalculations = useCallback(async () => {
    if (opportunityId === null) {
      setLoading(false);
      setError('Select a single deal to compare exit paths.');

      return;
    }

    try {
      const client = new CoreApiClient();

      // Append-only history: pull the recent slice ordered newest-first and
      // keep the first row seen per exit type rather than querying per path.
      const result = await client.query({
        opportunities: {
          __args: { filter: { id: { eq: opportunityId } }, first: 1 },
          edges: {
            node: {
              recommendedExitType: true,
              maoLastComputedAt: true,
              offerPrice: { amountMicros: true },
              contractPrice: { amountMicros: true },
            },
          },
        },
        maoCalculations: {
          __args: {
            filter: { opportunity: { id: { eq: opportunityId } } },
            orderBy: [{ version: 'Desc' }],
            first: 30,
          },
          edges: {
            node: {
              exitType: true,
              maoValue: { amountMicros: true },
              version: true,
              gateStatus: true,
              gateReason: true,
              inputsSnapshot: true,
              computedAt: true,
            },
          },
        },
      } as any);

      const latestByExitType: Record<string, MaoCalculation> = {};

      for (const edge of (result.maoCalculations as any)?.edges ?? []) {
        const calculation = edge.node as MaoCalculation;

        if (!latestByExitType[calculation.exitType]) {
          latestByExitType[calculation.exitType] = calculation;
        }
      }

      setData({
        deal: (result.opportunities as any)?.edges?.[0]?.node ?? null,
        latestByExitType,
      });
      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : String(fetchError),
      );
      setData(null);
    }

    setLoading(false);
  }, [opportunityId]);

  useEffect(() => {
    fetchMaoCalculations();
  }, [fetchMaoCalculations]);

  if (loading) return <Message>Loading exit paths…</Message>;

  if (error !== null) return <Message>{error}</Message>;

  if (data === null) return <Message>No MAO data available.</Message>;

  const recommendedExitType = data.deal?.recommendedExitType ?? null;
  const hasAnyCalculation = Object.keys(data.latestByExitType).length > 0;

  const recommended = recommendedExitType
    ? data.latestByExitType[recommendedExitType]
    : undefined;
  const recommendedMao = microsToDollars(recommended?.maoValue);
  const offerPrice = microsToDollars(data.deal?.offerPrice);
  const contractPrice = microsToDollars(data.deal?.contractPrice);
  const committedPrice = contractPrice ?? offerPrice;
  const headroom =
    recommendedMao !== null && committedPrice !== null
      ? recommendedMao - committedPrice
      : null;

  return (
    <div
      style={{
        padding: t('--t-spacing-4', '16px'),
        fontFamily: t('--t-font-family', 'Inter, sans-serif'),
        color: t('--t-font-color-primary', '#111'),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: t('--t-spacing-3', '12px'),
          marginBottom: t('--t-spacing-4', '16px'),
        }}
      >
        <span
          style={{
            fontSize: t('--t-font-size-md', '1rem'),
            fontWeight: 600,
          }}
        >
          Maximum Allowable Offer by exit path
        </span>
        {headroom !== null && (
          <Tag
            label={`${headroom >= 0 ? 'Headroom' : 'Over MAO'} ${formatUsd(
              Math.abs(headroom),
            )} vs ${contractPrice !== null ? 'contract' : 'offer'}`}
            color={headroom >= 0 ? 'green' : 'red'}
          />
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: t('--t-font-size-xs', '0.85rem'),
            color: t('--t-font-color-tertiary', '#999'),
          }}
        >
          Recomputed {formatTimestamp(data.deal?.maoLastComputedAt ?? null)}
        </span>
      </div>

      {!hasAnyCalculation && (
        <div
          style={{
            marginBottom: t('--t-spacing-4', '16px'),
            fontSize: t('--t-font-size-sm', '0.92rem'),
            color: t('--t-font-color-tertiary', '#999'),
          }}
        >
          No MAO has been computed yet. It recalculates automatically when the
          linked property, its comparable sales or infrastructure signals, or
          this deal&apos;s underwriting inputs change.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: t('--t-spacing-3', '12px'),
          alignItems: 'stretch',
        }}
      >
        {EXIT_PATHS.map((path) => (
          <ExitPathCard
            key={path.exitType}
            label={path.label}
            formula={path.formula}
            calculation={data.latestByExitType[path.exitType]}
            isRecommended={recommendedExitType === path.exitType}
          />
        ))}
      </div>

      {recommendedExitType === 'INSUFFICIENT_DATA' && (
        <div
          style={{
            marginTop: t('--t-spacing-3', '12px'),
            fontSize: t('--t-font-size-xs', '0.85rem'),
            color: t('--t-font-color-secondary', '#666'),
          }}
        >
          Every path is either gated or missing inputs, so no exit is
          recommended. Add comparable sales, subject acreage, or a
          post-entitlement value to produce a number.
        </div>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MAO_COMPARISON_FRONT_COMPONENT_ID,
  name: 'mao-comparison',
  description:
    'Side-by-side Maximum Allowable Offer comparison across the three exit paths, with gate reasons and the inputs behind each number',
  component: MaoComparisonPanel,
});

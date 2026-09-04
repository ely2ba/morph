import { catalog, type MachineType, type Product } from './catalog';
import type { NativeComponent } from './composition';

export type AssumptionId =
  | 'opening_width_cm'
  | 'opening_depth_cm'
  | 'opening_height_cm'
  | 'cycles_per_week'
  | 'ownership_years'
  | 'electricity_price_pence_per_kwh'
  | 'water_price_pence_per_litre'
  | 'delivery_within_days'
  | 'minimum_capacity_kg'
  | 'maximum_purchase_price'
  | 'machine_type';

export type NumericAssumptionId = Exclude<AssumptionId, 'machine_type'>;
export type MetricId =
  | 'purchase_price'
  | 'spin_noise_db'
  | 'capacity_kg'
  | 'ownership_cost'
  | 'energy_cost'
  | 'water_cost'
  | 'annual_running_cost'
  | 'running_cost_per_cycle'
  | 'narrowest_clearance_cm'
  | 'delivery_slack_days'
  | 'annual_energy_kwh'
  | 'annual_water_litres';
export type DerivedMetricId = Exclude<
  MetricId,
  'purchase_price' | 'spin_noise_db' | 'capacity_kg'
>;
export type RequirementId =
  | 'in_stock'
  | 'fits_opening'
  | 'delivery_within_days'
  | 'minimum_capacity_kg'
  | 'maximum_purchase_price'
  | 'machine_type';

export type Assumptions = Partial<Record<NumericAssumptionId, number>> & {
  machine_type?: MachineType;
};
export type Requirement = { id: RequirementId; value?: number | string };
export type DecisionConfig = {
  id: string;
  title: string;
  assumptions: Assumptions;
  requirements: Requirement[];
  visibleMetricIds: MetricId[];
  primarySort: { metricId: MetricId; direction: 'asc' | 'desc' };
  tradeoff?: {
    firstMetricId: MetricId;
    secondMetricId: MetricId;
    secondMetricWeight: number;
  };
  plot: { xMetricId: MetricId; yMetricId: MetricId; sizeMetricId?: MetricId };
  composition: NativeComponent[];
};

export type Evaluation = {
  product: Product;
  eligible: boolean;
  reasons: string[];
  reasonIds: RequirementId[];
  metrics: Record<MetricId, number>;
  clearances: { width: number; depth: number; height: number };
  rank?: number;
  strongTradeoff?: boolean;
};

export const assumptionMeta: Record<
  AssumptionId,
  {
    label: string;
    storageUnit: string;
    displayUnit: string;
    min: number;
    max: number;
    step: number;
    example: number | string;
    description: string;
    validValues?: MachineType[];
  }
> = {
  opening_width_cm: {
    label: 'Opening width',
    storageUnit: 'centimetres',
    displayUnit: 'cm',
    min: 45,
    max: 100,
    step: 0.1,
    example: 60,
    description: 'Clear internal width of the alcove.',
  },
  opening_depth_cm: {
    label: 'Installed depth',
    storageUnit: 'centimetres',
    displayUnit: 'cm',
    min: 45,
    max: 100,
    step: 0.1,
    example: 62,
    description: 'Usable depth including hoses and required rear space.',
  },
  opening_height_cm: {
    label: 'Opening height',
    storageUnit: 'centimetres',
    displayUnit: 'cm',
    min: 70,
    max: 110,
    step: 0.1,
    example: 85,
    description: 'Clear internal height of the alcove.',
  },
  cycles_per_week: {
    label: 'Washes each week',
    storageUnit: 'cycles_per_week',
    displayUnit: 'washes',
    min: 1,
    max: 30,
    step: 1,
    example: 5,
    description: 'Estimated Eco 40–60 cycles each week.',
  },
  ownership_years: {
    label: 'Years of ownership',
    storageUnit: 'years',
    displayUnit: 'years',
    min: 1,
    max: 20,
    step: 1,
    example: 8,
    description: 'How long you expect to keep the machine.',
  },
  electricity_price_pence_per_kwh: {
    label: 'Electricity price',
    storageUnit: 'pence_per_kwh',
    displayUnit: 'p/kWh',
    min: 1,
    max: 150,
    step: 0.1,
    example: 29,
    description: 'Your electricity unit rate in pence.',
  },
  water_price_pence_per_litre: {
    label: 'Water price',
    storageUnit: 'pence_per_litre',
    displayUnit: 'p/litre',
    min: 0,
    max: 5,
    step: 0.1,
    example: 0.4,
    description: 'Combined water and wastewater rate in pence per litre.',
  },
  delivery_within_days: {
    label: 'Arrives within',
    storageUnit: 'days',
    displayUnit: 'days',
    min: 0,
    max: 30,
    step: 1,
    example: 4,
    description: 'Latest acceptable delivery offset from today.',
  },
  minimum_capacity_kg: {
    label: 'Minimum capacity',
    storageUnit: 'kilograms',
    displayUnit: 'kg',
    min: 5,
    max: 15,
    step: 1,
    example: 9,
    description: 'Smallest drum capacity you will accept.',
  },
  maximum_purchase_price: {
    label: 'Maximum price',
    storageUnit: 'gbp',
    displayUnit: '£',
    min: 200,
    max: 2500,
    step: 10,
    example: 650,
    description: 'Highest purchase price you will accept.',
  },
  machine_type: {
    label: 'Machine type',
    storageUnit: 'enum',
    displayUnit: 'type',
    min: 0,
    max: 0,
    step: 0,
    example: 'integrated',
    validValues: ['freestanding', 'integrated'],
    description: 'Freestanding or integrated installation.',
  },
};

export const metricMeta: Record<
  MetricId,
  {
    label: string;
    unit: string;
    direction: 'asc' | 'desc';
    requires: AssumptionId[];
  }
> = {
  purchase_price: {
    label: 'Purchase price',
    unit: 'GBP',
    direction: 'asc',
    requires: [],
  },
  spin_noise_db: {
    label: 'Spin noise',
    unit: 'dB',
    direction: 'asc',
    requires: [],
  },
  capacity_kg: {
    label: 'Capacity',
    unit: 'kg',
    direction: 'desc',
    requires: [],
  },
  ownership_cost: {
    label: 'Ownership cost',
    unit: 'GBP',
    direction: 'asc',
    requires: [
      'cycles_per_week',
      'ownership_years',
      'electricity_price_pence_per_kwh',
      'water_price_pence_per_litre',
    ],
  },
  energy_cost: {
    label: 'Energy cost',
    unit: 'GBP',
    direction: 'asc',
    requires: [
      'cycles_per_week',
      'ownership_years',
      'electricity_price_pence_per_kwh',
    ],
  },
  water_cost: {
    label: 'Water cost',
    unit: 'GBP',
    direction: 'asc',
    requires: [
      'cycles_per_week',
      'ownership_years',
      'water_price_pence_per_litre',
    ],
  },
  annual_running_cost: {
    label: 'Annual running cost',
    unit: 'GBP/year',
    direction: 'asc',
    requires: [
      'cycles_per_week',
      'electricity_price_pence_per_kwh',
      'water_price_pence_per_litre',
    ],
  },
  running_cost_per_cycle: {
    label: 'Running cost per wash',
    unit: 'GBP/cycle',
    direction: 'asc',
    requires: [
      'electricity_price_pence_per_kwh',
      'water_price_pence_per_litre',
    ],
  },
  narrowest_clearance_cm: {
    label: 'Narrowest clearance',
    unit: 'cm',
    direction: 'desc',
    requires: ['opening_width_cm', 'opening_depth_cm', 'opening_height_cm'],
  },
  delivery_slack_days: {
    label: 'Delivery slack',
    unit: 'days',
    direction: 'desc',
    requires: ['delivery_within_days'],
  },
  annual_energy_kwh: {
    label: 'Annual energy use',
    unit: 'kWh/year',
    direction: 'asc',
    requires: ['cycles_per_week'],
  },
  annual_water_litres: {
    label: 'Annual water use',
    unit: 'litres/year',
    direction: 'asc',
    requires: ['cycles_per_week'],
  },
};

export const defaultDecision: DecisionConfig = {
  id: 'personal-washer-comparison',
  title: 'Washing machines that fit your space and deadline.',
  assumptions: {
    opening_width_cm: 60,
    opening_depth_cm: 62,
    opening_height_cm: 85,
    cycles_per_week: 5,
    ownership_years: 8,
    electricity_price_pence_per_kwh: 29,
    water_price_pence_per_litre: 0.4,
    delivery_within_days: 4,
  },
  requirements: [
    { id: 'in_stock' },
    { id: 'fits_opening' },
    { id: 'delivery_within_days' },
  ],
  visibleMetricIds: [
    'ownership_cost',
    'running_cost_per_cycle',
    'narrowest_clearance_cm',
    'spin_noise_db',
    'delivery_slack_days',
  ],
  primarySort: { metricId: 'ownership_cost', direction: 'asc' },
  tradeoff: {
    firstMetricId: 'purchase_price',
    secondMetricId: 'spin_noise_db',
    secondMetricWeight: 0.5,
  },
  plot: {
    xMetricId: 'purchase_price',
    yMetricId: 'spin_noise_db',
    sizeMetricId: 'capacity_kg',
  },
  composition: [
    { id: 'summary', type: 'decision_summary' },
    { id: 'inputs', type: 'assumptions' },
    { id: 'tradeoff', type: 'tradeoff_board' },
    { id: 'results', type: 'ranked_cards' },
    { id: 'comparison', type: 'comparison' },
    { id: 'exclusions', type: 'exclusions' },
  ],
};

const value = (
  assumptions: Assumptions,
  id: NumericAssumptionId,
  fallback = 0,
) => assumptions[id] ?? fallback;
const precise = (n: number) => Math.round(n * 10000) / 10000;

export function evaluateProduct(
  product: Product,
  config: DecisionConfig,
): Evaluation {
  const a = config.assumptions;
  const annualCycles = value(a, 'cycles_per_week') * 52;
  const totalCycles = annualCycles * value(a, 'ownership_years');
  const electricityPerKwh = value(a, 'electricity_price_pence_per_kwh') / 100;
  const waterPerLitre = value(a, 'water_price_pence_per_litre') / 100;
  const energyPerCycle = product.energyKwhPer100 / 100;
  const perCycle = precise(
    energyPerCycle * electricityPerKwh +
      product.waterLitresPerCycle * waterPerLitre,
  );
  const energyCost = precise(totalCycles * energyPerCycle * electricityPerKwh);
  const waterCost = precise(
    totalCycles * product.waterLitresPerCycle * waterPerLitre,
  );
  const clearances = {
    width: precise(value(a, 'opening_width_cm', 999) - product.widthCm),
    depth: precise(
      value(a, 'opening_depth_cm', 999) - product.installedDepthCm,
    ),
    height: precise(value(a, 'opening_height_cm', 999) - product.heightCm),
  };
  const reasons: string[] = [];
  const reasonIds: RequirementId[] = [];
  const has = (id: RequirementId) =>
    config.requirements.some((r) => r.id === id);
  if (has('in_stock') && !product.inStock) {
    reasons.push('Out of stock');
    reasonIds.push('in_stock');
  }
  if (has('fits_opening')) {
    if (clearances.width < 0) {
      reasons.push(`${Math.abs(clearances.width).toFixed(1)} cm too wide`);
      reasonIds.push('fits_opening');
    }
    if (clearances.depth < 0) {
      reasons.push(
        `${Math.abs(clearances.depth).toFixed(1)} cm too deep installed`,
      );
      if (!reasonIds.includes('fits_opening')) reasonIds.push('fits_opening');
    }
    if (clearances.height < 0) {
      reasons.push(`${Math.abs(clearances.height).toFixed(1)} cm too tall`);
      if (!reasonIds.includes('fits_opening')) reasonIds.push('fits_opening');
    }
  }
  if (
    has('delivery_within_days') &&
    product.deliveryDays > value(a, 'delivery_within_days')
  ) {
    reasons.push(
      `Arrives ${product.deliveryDays - value(a, 'delivery_within_days')} day${product.deliveryDays - value(a, 'delivery_within_days') === 1 ? '' : 's'} too late`,
    );
    reasonIds.push('delivery_within_days');
  }
  if (
    has('minimum_capacity_kg') &&
    product.capacityKg < value(a, 'minimum_capacity_kg')
  ) {
    reasons.push(`Below ${value(a, 'minimum_capacity_kg')} kg capacity`);
    reasonIds.push('minimum_capacity_kg');
  }
  if (
    has('maximum_purchase_price') &&
    product.price > value(a, 'maximum_purchase_price')
  ) {
    reasons.push(
      `£${product.price - value(a, 'maximum_purchase_price')} over budget`,
    );
    reasonIds.push('maximum_purchase_price');
  }
  if (
    has('machine_type') &&
    a.machine_type &&
    product.type !== a.machine_type
  ) {
    reasons.push(`Not ${a.machine_type}`);
    reasonIds.push('machine_type');
  }
  return {
    product,
    eligible: reasons.length === 0,
    reasons,
    reasonIds,
    clearances,
    metrics: {
      purchase_price: product.price,
      spin_noise_db: product.noiseDb,
      capacity_kg: product.capacityKg,
      ownership_cost: precise(product.price + energyCost + waterCost),
      energy_cost: energyCost,
      water_cost: waterCost,
      annual_running_cost: precise(annualCycles * perCycle),
      running_cost_per_cycle: perCycle,
      narrowest_clearance_cm: Math.min(
        clearances.width,
        clearances.depth,
        clearances.height,
      ),
      delivery_slack_days:
        value(a, 'delivery_within_days') - product.deliveryDays,
      annual_energy_kwh: precise(annualCycles * energyPerCycle),
      annual_water_litres: precise(annualCycles * product.waterLitresPerCycle),
    },
  };
}

function normalized(
  values: number[],
  current: number,
  direction: 'asc' | 'desc',
) {
  const min = Math.min(...values),
    max = Math.max(...values);
  if (max === min) return 0;
  const raw = (current - min) / (max - min);
  return direction === 'asc' ? raw : 1 - raw;
}

export function rankEvaluations(
  rows: Evaluation[],
  config: DecisionConfig,
  hiddenIds: string[] = [],
) {
  const visible = rows.filter(
    (row) => row.eligible && !hiddenIds.includes(row.product.id),
  );
  const tradeoff = config.tradeoff;
  const sorted = [...visible].sort((a, b) => {
    if (tradeoff) {
      const first = visible.map((row) => row.metrics[tradeoff.firstMetricId]);
      const second = visible.map((row) => row.metrics[tradeoff.secondMetricId]);
      const aScore =
        normalized(
          first,
          a.metrics[tradeoff.firstMetricId],
          metricMeta[tradeoff.firstMetricId].direction,
        ) *
          (1 - tradeoff.secondMetricWeight) +
        normalized(
          second,
          a.metrics[tradeoff.secondMetricId],
          metricMeta[tradeoff.secondMetricId].direction,
        ) *
          tradeoff.secondMetricWeight;
      const bScore =
        normalized(
          first,
          b.metrics[tradeoff.firstMetricId],
          metricMeta[tradeoff.firstMetricId].direction,
        ) *
          (1 - tradeoff.secondMetricWeight) +
        normalized(
          second,
          b.metrics[tradeoff.secondMetricId],
          metricMeta[tradeoff.secondMetricId].direction,
        ) *
          tradeoff.secondMetricWeight;
      // Scores this close are functionally the same at the visible control's precision,
      // so the documented ownership-cost tie-breaker keeps usage changes meaningful.
      if (Math.abs(aScore - bScore) > 0.005) return aScore - bScore;
    } else {
      const dir = config.primarySort.direction === 'asc' ? 1 : -1;
      const diff =
        (a.metrics[config.primarySort.metricId] -
          b.metrics[config.primarySort.metricId]) *
        dir;
      if (diff) return diff;
    }
    const costDiff = a.metrics.ownership_cost - b.metrics.ownership_cost;
    return costDiff || a.product.id.localeCompare(b.product.id);
  });
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function findStrongTradeoffs(
  rows: Evaluation[],
  config: DecisionConfig,
) {
  const { xMetricId: x, yMetricId: y } = config.plot;
  const xDirection = metricMeta[x].direction;
  const yDirection = metricMeta[y].direction;
  const betterOrEqual = (
    one: number,
    two: number,
    direction: 'asc' | 'desc',
  ) => (direction === 'asc' ? one <= two : one >= two);
  const better = (one: number, two: number, direction: 'asc' | 'desc') =>
    direction === 'asc' ? one < two : one > two;
  return rows
    .filter(
      (candidate) =>
        !rows.some(
          (other) =>
            other.product.id !== candidate.product.id &&
            betterOrEqual(other.metrics[x], candidate.metrics[x], xDirection) &&
            betterOrEqual(other.metrics[y], candidate.metrics[y], yDirection) &&
            (better(other.metrics[x], candidate.metrics[x], xDirection) ||
              better(other.metrics[y], candidate.metrics[y], yDirection)),
        ),
    )
    .map((row) => row.product.id);
}

export function evaluateCatalog(
  config: DecisionConfig,
  hiddenIds: string[] = [],
) {
  const all = catalog.map((product) => evaluateProduct(product, config));
  const ranked = rankEvaluations(all, config, hiddenIds);
  const strong = findStrongTradeoffs(ranked, config);
  const rankedWithStrong = ranked.map((row) => ({
    ...row,
    strongTradeoff: strong.includes(row.product.id),
  }));
  const exclusions = all.filter((row) => !row.eligible);
  const counts: Partial<Record<RequirementId | 'multiple', number>> = {};
  for (const row of exclusions) {
    if (row.reasonIds.length > 1) counts.multiple = (counts.multiple ?? 0) + 1;
    for (const id of new Set(row.reasonIds)) counts[id] = (counts[id] ?? 0) + 1;
  }
  return {
    all,
    ranked: rankedWithStrong,
    excluded: exclusions,
    exclusions: counts,
    strong,
  };
}

export type Relaxation = {
  id: NumericAssumptionId;
  label: string;
  value: number;
  delta: number;
  admitted: number;
  proportional: number;
  direction: 'increase' | 'decrease';
  stableOrder: number;
};

export function findNearestRelaxations(
  config: DecisionConfig,
  hiddenIds: string[] = [],
) {
  const assumptions = config.assumptions;
  const candidates: Relaxation[] = [];
  const specs: Array<{
    id: NumericAssumptionId;
    requirementId: RequirementId;
    direction: 'increase' | 'decrease';
    getter: (p: Product) => number;
  }> = [
    {
      id: 'opening_depth_cm',
      requirementId: 'fits_opening',
      direction: 'increase',
      getter: (p) => p.installedDepthCm,
    },
    {
      id: 'opening_width_cm',
      requirementId: 'fits_opening',
      direction: 'increase',
      getter: (p) => p.widthCm,
    },
    {
      id: 'opening_height_cm',
      requirementId: 'fits_opening',
      direction: 'increase',
      getter: (p) => p.heightCm,
    },
    {
      id: 'delivery_within_days',
      requirementId: 'delivery_within_days',
      direction: 'increase',
      getter: (p) => p.deliveryDays,
    },
    {
      id: 'minimum_capacity_kg',
      requirementId: 'minimum_capacity_kg',
      direction: 'decrease',
      getter: (p) => p.capacityKg,
    },
    {
      id: 'maximum_purchase_price',
      requirementId: 'maximum_purchase_price',
      direction: 'increase',
      getter: (p) => p.price,
    },
  ];

  for (const [stableOrder, spec] of specs.entries()) {
    const current = assumptions[spec.id];
    if (
      current == null ||
      !config.requirements.some(
        (requirement) => requirement.id === spec.requirementId,
      )
    )
      continue;
    const thresholds = [
      ...new Set(
        catalog
          .map(spec.getter)
          .filter((threshold) =>
            spec.direction === 'increase'
              ? threshold > current
              : threshold < current,
          ),
      ),
    ].sort((a, b) => (spec.direction === 'increase' ? a - b : b - a));

    for (const threshold of thresholds) {
      const nextRequirements = config.requirements.map((requirement) =>
        requirement.id === spec.id && requirement.value != null
          ? { ...requirement, value: threshold }
          : requirement,
      );
      const nextConfig: DecisionConfig = {
        ...config,
        assumptions: { ...assumptions, [spec.id]: threshold },
        requirements: nextRequirements,
      };
      const admitted = evaluateCatalog(nextConfig, hiddenIds).ranked.length;
      if (!admitted) continue;
      const delta = Math.abs(threshold - current);
      candidates.push({
        id: spec.id,
        label: assumptionMeta[spec.id].label,
        value: threshold,
        delta,
        admitted,
        proportional: delta / Math.max(Math.abs(current), 1),
        direction: spec.direction,
        stableOrder,
      });
      break;
    }
  }

  return candidates
    .sort(
      (a, b) =>
        a.proportional - b.proportional ||
        b.admitted - a.admitted ||
        a.stableOrder - b.stableOrder,
    )
    .slice(0, 3);
}

export type CalculationBreakdown = {
  productId: string;
  model: string;
  metricId: DerivedMetricId;
  result: number;
  formattedResult: string;
  shopperInputs: Array<{ id: string; label: string; display: string }>;
  productFacts: Array<{ id: string; label: string; display: string }>;
  steps: Array<{
    id: string;
    label: string;
    expression: string;
    value: number;
    formattedValue: string;
  }>;
  estimateBasis: string;
  exclusions: string[];
};

const number = (amount: number, maximumFractionDigits = 4) =>
  amount.toLocaleString('en-GB', { maximumFractionDigits });
const money = (amount: number, fixed = true) =>
  fixed
    ? `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `£${number(amount)}`;
const plural = (count: number, singular: string, many = `${singular}s`) =>
  Math.abs(count) === 1 ? singular : many;

function formattedMetricResult(metricId: DerivedMetricId, result: number) {
  if (
    [
      'ownership_cost',
      'energy_cost',
      'water_cost',
      'annual_running_cost',
    ].includes(metricId)
  )
    return money(result);
  if (metricId === 'running_cost_per_cycle')
    return `${(result * 100).toFixed(1)}p per wash`;
  if (metricId === 'narrowest_clearance_cm') return `${number(result, 1)} cm`;
  if (metricId === 'delivery_slack_days')
    return `${number(result, 0)} ${plural(result, 'day')}`;
  if (metricId === 'annual_energy_kwh') return `${number(result, 2)} kWh/year`;
  return `${number(result, 0)} L/year`;
}

export function explainMetric(
  evaluation: Evaluation,
  metricId: DerivedMetricId,
  config: DecisionConfig,
): CalculationBreakdown {
  const assumptions = config.assumptions;
  const product = evaluation.product;
  const cyclesPerWeek = value(assumptions, 'cycles_per_week');
  const ownershipYears = value(assumptions, 'ownership_years');
  const annualCycles = cyclesPerWeek * 52;
  const totalCycles = annualCycles * ownershipYears;
  const electricityRate =
    value(assumptions, 'electricity_price_pence_per_kwh') / 100;
  const waterRate = value(assumptions, 'water_price_pence_per_litre') / 100;
  const energyPerCycle = product.energyKwhPer100 / 100;
  const energyOverOwnership = precise(totalCycles * energyPerCycle);
  const waterOverOwnership = precise(totalCycles * product.waterLitresPerCycle);
  const energyCost = precise(energyOverOwnership * electricityRate);
  const waterCost = precise(waterOverOwnership * waterRate);
  const annualEnergy = precise(annualCycles * energyPerCycle);
  const annualWater = precise(annualCycles * product.waterLitresPerCycle);
  const energyCostPerCycle = precise(energyPerCycle * electricityRate);
  const waterCostPerCycle = precise(product.waterLitresPerCycle * waterRate);
  const costPerCycle = evaluation.metrics.running_cost_per_cycle;
  const step = (
    id: string,
    label: string,
    expression: string,
    stepValue: number,
    formattedValue: string,
  ) => ({ id, label, expression, value: stepValue, formattedValue });
  const input = (id: string, label: string, display: string) => ({
    id,
    label,
    display,
  });
  const fact = (id: string, label: string, display: string) => ({
    id,
    label,
    display,
  });
  let shopperInputs: CalculationBreakdown['shopperInputs'] = [];
  let productFacts: CalculationBreakdown['productFacts'] = [];
  let steps: CalculationBreakdown['steps'] = [];

  if (['ownership_cost', 'energy_cost', 'water_cost'].includes(metricId)) {
    shopperInputs = [
      input(
        'cycles_per_week',
        'Washes each week',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}`,
      ),
      input(
        'ownership_years',
        'Ownership period',
        `${number(ownershipYears)} ${plural(ownershipYears, 'year')}`,
      ),
    ];
    steps.push(
      step(
        'total_cycles',
        'Total cycles',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}/week × 52 weeks × ${number(ownershipYears)} ${plural(ownershipYears, 'year')} = ${number(totalCycles)} cycles`,
        totalCycles,
        `${number(totalCycles)} cycles`,
      ),
    );
  }

  if (metricId === 'ownership_cost' || metricId === 'energy_cost') {
    shopperInputs.push(
      input(
        'electricity_rate',
        'Electricity price',
        `${number(value(assumptions, 'electricity_price_pence_per_kwh'))}p/kWh`,
      ),
    );
    productFacts.push(
      fact(
        'energy_per_100',
        'Eco 40–60 energy',
        `${number(product.energyKwhPer100)} kWh/100 cycles`,
      ),
    );
    steps.push(
      step(
        'energy_use',
        'Electricity use',
        `${number(product.energyKwhPer100)} kWh/100 cycles × ${number(totalCycles)} cycles = ${number(energyOverOwnership)} kWh`,
        energyOverOwnership,
        `${number(energyOverOwnership)} kWh`,
      ),
      step(
        'energy_cost',
        'Electricity cost',
        `${number(energyOverOwnership)} kWh × ${money(electricityRate, false)} = ${money(energyCost)}`,
        energyCost,
        money(energyCost),
      ),
    );
  }

  if (metricId === 'ownership_cost' || metricId === 'water_cost') {
    shopperInputs.push(
      input(
        'water_rate',
        'Water price',
        `${number(value(assumptions, 'water_price_pence_per_litre'))}p/litre`,
      ),
    );
    productFacts.push(
      fact(
        'water_per_cycle',
        'Eco 40–60 water',
        `${number(product.waterLitresPerCycle)} L/cycle`,
      ),
    );
    steps.push(
      step(
        'water_use',
        'Water use',
        `${number(product.waterLitresPerCycle)} L/cycle × ${number(totalCycles)} cycles = ${number(waterOverOwnership)} L`,
        waterOverOwnership,
        `${number(waterOverOwnership)} L`,
      ),
      step(
        'water_cost',
        'Water cost',
        `${number(waterOverOwnership)} L × ${money(waterRate, false)} = ${money(waterCost)}`,
        waterCost,
        money(waterCost),
      ),
    );
  }

  if (metricId === 'ownership_cost') {
    productFacts.unshift(
      fact('purchase_price', 'Purchase price', money(product.price, false)),
    );
    steps.push(
      step(
        'ownership_total',
        'Final addition',
        `${money(product.price, false)} + ${money(energyCost)} + ${money(waterCost)} = ${money(evaluation.metrics.ownership_cost)}`,
        evaluation.metrics.ownership_cost,
        money(evaluation.metrics.ownership_cost),
      ),
    );
  } else if (
    metricId === 'annual_running_cost' ||
    metricId === 'running_cost_per_cycle'
  ) {
    shopperInputs = [
      ...(metricId === 'annual_running_cost'
        ? [
            input(
              'cycles_per_week',
              'Washes each week',
              `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}`,
            ),
          ]
        : []),
      input(
        'electricity_rate',
        'Electricity price',
        `${number(value(assumptions, 'electricity_price_pence_per_kwh'))}p/kWh`,
      ),
      input(
        'water_rate',
        'Water price',
        `${number(value(assumptions, 'water_price_pence_per_litre'))}p/litre`,
      ),
    ];
    productFacts = [
      fact(
        'energy_per_100',
        'Eco 40–60 energy',
        `${number(product.energyKwhPer100)} kWh/100 cycles`,
      ),
      fact(
        'water_per_cycle',
        'Eco 40–60 water',
        `${number(product.waterLitresPerCycle)} L/cycle`,
      ),
    ];
    steps = [
      ...(metricId === 'annual_running_cost'
        ? [
            step(
              'annual_cycles',
              'Annual cycles',
              `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}/week × 52 weeks = ${number(annualCycles)} cycles/year`,
              annualCycles,
              `${number(annualCycles)} cycles/year`,
            ),
          ]
        : []),
      step(
        'energy_per_cycle',
        'Electricity per wash',
        `${number(product.energyKwhPer100)} kWh/100 cycles = ${number(energyPerCycle)} kWh/cycle`,
        energyPerCycle,
        `${number(energyPerCycle)} kWh/cycle`,
      ),
      step(
        'energy_cost_per_cycle',
        'Electricity cost per wash',
        `${number(energyPerCycle)} kWh × ${money(electricityRate, false)} = ${money(energyCostPerCycle, false)}`,
        energyCostPerCycle,
        money(energyCostPerCycle, false),
      ),
      step(
        'water_cost_per_cycle',
        'Water cost per wash',
        `${number(product.waterLitresPerCycle)} L × ${money(waterRate, false)} = ${money(waterCostPerCycle, false)}`,
        waterCostPerCycle,
        money(waterCostPerCycle, false),
      ),
      step(
        'running_cost_per_cycle',
        'Total per wash',
        `${money(energyCostPerCycle, false)} + ${money(waterCostPerCycle, false)} = ${money(costPerCycle, false)}`,
        costPerCycle,
        `${(costPerCycle * 100).toFixed(1)}p`,
      ),
      ...(metricId === 'annual_running_cost'
        ? [
            step(
              'annual_running_cost',
              'Annual running cost',
              `${money(costPerCycle, false)} × ${number(annualCycles)} cycles = ${money(evaluation.metrics.annual_running_cost)}`,
              evaluation.metrics.annual_running_cost,
              money(evaluation.metrics.annual_running_cost),
            ),
          ]
        : []),
    ];
  } else if (metricId === 'annual_energy_kwh') {
    shopperInputs = [
      input(
        'cycles_per_week',
        'Washes each week',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}`,
      ),
    ];
    productFacts = [
      fact(
        'energy_per_100',
        'Eco 40–60 energy',
        `${number(product.energyKwhPer100)} kWh/100 cycles`,
      ),
    ];
    steps = [
      step(
        'annual_cycles',
        'Annual cycles',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}/week × 52 weeks = ${number(annualCycles)} cycles/year`,
        annualCycles,
        `${number(annualCycles)} cycles/year`,
      ),
      step(
        'annual_energy',
        'Annual electricity use',
        `${number(product.energyKwhPer100)} kWh/100 cycles × ${number(annualCycles)} cycles = ${number(annualEnergy)} kWh/year`,
        annualEnergy,
        `${number(annualEnergy)} kWh/year`,
      ),
    ];
  } else if (metricId === 'annual_water_litres') {
    shopperInputs = [
      input(
        'cycles_per_week',
        'Washes each week',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}`,
      ),
    ];
    productFacts = [
      fact(
        'water_per_cycle',
        'Eco 40–60 water',
        `${number(product.waterLitresPerCycle)} L/cycle`,
      ),
    ];
    steps = [
      step(
        'annual_cycles',
        'Annual cycles',
        `${number(cyclesPerWeek)} ${plural(cyclesPerWeek, 'wash', 'washes')}/week × 52 weeks = ${number(annualCycles)} cycles/year`,
        annualCycles,
        `${number(annualCycles)} cycles/year`,
      ),
      step(
        'annual_water',
        'Annual water use',
        `${number(product.waterLitresPerCycle)} L/cycle × ${number(annualCycles)} cycles = ${number(annualWater)} L/year`,
        annualWater,
        `${number(annualWater)} L/year`,
      ),
    ];
  } else if (metricId === 'narrowest_clearance_cm') {
    const dimensions = [
      [
        'width',
        value(assumptions, 'opening_width_cm'),
        product.widthCm,
        evaluation.clearances.width,
      ],
      [
        'depth',
        value(assumptions, 'opening_depth_cm'),
        product.installedDepthCm,
        evaluation.clearances.depth,
      ],
      [
        'height',
        value(assumptions, 'opening_height_cm'),
        product.heightCm,
        evaluation.clearances.height,
      ],
    ] as const;
    const tightest = dimensions.reduce((best, current) =>
      current[3] < best[3] ? current : best,
    );
    shopperInputs = dimensions.map(([dimension, opening]) =>
      input(
        `opening_${dimension}`,
        `Opening ${dimension}`,
        `${number(opening, 1)} cm`,
      ),
    );
    productFacts = dimensions.map(([dimension, , installed]) =>
      fact(
        `installed_${dimension}`,
        `Required installed ${dimension}`,
        `${number(installed, 1)} cm`,
      ),
    );
    steps = [
      ...dimensions.map(([dimension, opening, installed, clearance]) =>
        step(
          `${dimension}_clearance`,
          `${dimension[0].toUpperCase()}${dimension.slice(1)} clearance`,
          `${number(opening, 1)} cm − ${number(installed, 1)} cm = ${number(clearance, 1)} cm`,
          clearance,
          `${number(clearance, 1)} cm`,
        ),
      ),
      step(
        'tightest_clearance',
        'Tightest dimension',
        `${tightest[0][0].toUpperCase()}${tightest[0].slice(1)} is the tightest at ${number(tightest[3], 1)} cm`,
        tightest[3],
        `${number(tightest[3], 1)} cm`,
      ),
    ];
  } else if (metricId === 'delivery_slack_days') {
    const allowedDays = value(assumptions, 'delivery_within_days');
    const slack = evaluation.metrics.delivery_slack_days;
    shopperInputs = [
      input(
        'delivery_within_days',
        'Latest acceptable delivery',
        `${number(allowedDays, 0)} ${plural(allowedDays, 'day')}`,
      ),
    ];
    productFacts = [
      fact(
        'delivery_days',
        'Quoted delivery',
        `${number(product.deliveryDays, 0)} ${plural(product.deliveryDays, 'day')}`,
      ),
    ];
    steps = [
      step(
        'delivery_slack',
        'Delivery slack',
        `${number(allowedDays, 0)} allowed ${plural(allowedDays, 'day')} − ${number(product.deliveryDays, 0)} delivery ${plural(product.deliveryDays, 'day')} = ${number(slack, 0)} ${plural(slack, 'day')}`,
        slack,
        `${number(slack, 0)} ${plural(slack, 'day')}`,
      ),
    ];
  }

  let estimateBasis =
    'Calculated from the product’s Eco 40–60 specification and your current usage and utility inputs.';
  let exclusions = [
    'Non-Eco programmes',
    'Tariff standing charges',
    'Changes to future utility prices',
  ];
  if (metricId === 'ownership_cost') {
    estimateBasis =
      'Calculated from the current purchase price, the product’s Eco 40–60 specification, and your usage and utility inputs.';
    exclusions = [
      'Detergent',
      'Repairs and maintenance',
      'Finance costs',
      'Resale value',
    ];
  } else if (metricId === 'annual_energy_kwh') {
    estimateBasis =
      'Calculated from Eco 40–60 energy use and your weekly wash estimate.';
    exclusions = [
      'Other programmes and temperatures',
      'Standby energy',
      'Changes in household usage',
    ];
  } else if (metricId === 'annual_water_litres') {
    estimateBasis =
      'Calculated from Eco 40–60 water use and your weekly wash estimate.';
    exclusions = [
      'Other programmes and load sizes',
      'Installation leaks',
      'Changes in household usage',
    ];
  } else if (metricId === 'narrowest_clearance_cm') {
    estimateBasis =
      'Calculated from your measured opening minus the retailer’s required installed dimensions, including stated clearances.';
    exclusions = [
      'Door-opening space',
      'Uneven floors or walls',
      'Installer tolerances beyond the stated specification',
    ];
  } else if (metricId === 'delivery_slack_days') {
    estimateBasis =
      'Calculated from your latest acceptable delivery day minus the retailer’s current quoted delivery offset.';
    exclusions = [
      'Carrier delays',
      'Installation appointment availability',
      'Delivery-date changes after ordering',
    ];
  }

  return {
    productId: product.id,
    model: `${product.brand} ${product.model}`,
    metricId,
    result: evaluation.metrics[metricId],
    formattedResult: formattedMetricResult(
      metricId,
      evaluation.metrics[metricId],
    ),
    shopperInputs,
    productFacts,
    steps,
    estimateBasis,
    exclusions,
  };
}

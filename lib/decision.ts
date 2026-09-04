import { catalog, type MachineType, type Product } from './catalog';

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
export type DerivedMetricId = Exclude<MetricId, 'purchase_price' | 'spin_noise_db' | 'capacity_kg'>;
export type RequirementId = 'in_stock' | 'fits_opening' | 'delivery_within_days' | 'minimum_capacity_kg' | 'maximum_purchase_price' | 'machine_type';

export type Assumptions = Partial<Record<NumericAssumptionId, number>> & { machine_type?: MachineType };
export type Requirement = { id: RequirementId; value?: number | string };
export type DecisionConfig = {
  id: string;
  title: string;
  assumptions: Assumptions;
  requirements: Requirement[];
  visibleMetricIds: MetricId[];
  primarySort: { metricId: MetricId; direction: 'asc' | 'desc' };
  tradeoff?: { firstMetricId: MetricId; secondMetricId: MetricId; secondMetricWeight: number };
  plot: { xMetricId: MetricId; yMetricId: MetricId; sizeMetricId?: MetricId };
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

export const assumptionMeta: Record<AssumptionId, { label: string; storageUnit: string; displayUnit: string; min: number; max: number; step: number; example: number | string; description: string }> = {
  opening_width_cm: { label: 'Opening width', storageUnit: 'centimetres', displayUnit: 'cm', min: 45, max: 100, step: .1, example: 60, description: 'Clear internal width of the alcove.' },
  opening_depth_cm: { label: 'Installed depth', storageUnit: 'centimetres', displayUnit: 'cm', min: 45, max: 100, step: .1, example: 62, description: 'Usable depth including hoses and required rear space.' },
  opening_height_cm: { label: 'Opening height', storageUnit: 'centimetres', displayUnit: 'cm', min: 70, max: 110, step: .1, example: 85, description: 'Clear internal height of the alcove.' },
  cycles_per_week: { label: 'Washes each week', storageUnit: 'cycles_per_week', displayUnit: 'washes', min: 1, max: 30, step: 1, example: 5, description: 'Estimated Eco 40–60 cycles each week.' },
  ownership_years: { label: 'Years of ownership', storageUnit: 'years', displayUnit: 'years', min: 1, max: 20, step: 1, example: 8, description: 'How long you expect to keep the machine.' },
  electricity_price_pence_per_kwh: { label: 'Electricity price', storageUnit: 'pence_per_kwh', displayUnit: 'p/kWh', min: 1, max: 150, step: .1, example: 29, description: 'Your electricity unit rate in pence.' },
  water_price_pence_per_litre: { label: 'Water price', storageUnit: 'pence_per_litre', displayUnit: 'p/litre', min: 0, max: 5, step: .1, example: .4, description: 'Combined water and wastewater rate in pence per litre.' },
  delivery_within_days: { label: 'Arrives within', storageUnit: 'days', displayUnit: 'days', min: 0, max: 30, step: 1, example: 4, description: 'Latest acceptable delivery offset from today.' },
  minimum_capacity_kg: { label: 'Minimum capacity', storageUnit: 'kilograms', displayUnit: 'kg', min: 5, max: 15, step: 1, example: 9, description: 'Smallest drum capacity you will accept.' },
  maximum_purchase_price: { label: 'Maximum price', storageUnit: 'gbp', displayUnit: '£', min: 200, max: 2500, step: 10, example: 650, description: 'Highest purchase price you will accept.' },
  machine_type: { label: 'Machine type', storageUnit: 'enum', displayUnit: 'type', min: 0, max: 0, step: 0, example: 'integrated', description: 'Freestanding or integrated installation.' },
};

export const metricMeta: Record<MetricId, { label: string; unit: string; direction: 'asc' | 'desc'; requires: AssumptionId[] }> = {
  purchase_price: { label: 'Purchase price', unit: 'GBP', direction: 'asc', requires: [] },
  spin_noise_db: { label: 'Spin noise', unit: 'dB', direction: 'asc', requires: [] },
  capacity_kg: { label: 'Capacity', unit: 'kg', direction: 'desc', requires: [] },
  ownership_cost: { label: 'Ownership cost', unit: 'GBP', direction: 'asc', requires: ['cycles_per_week', 'ownership_years', 'electricity_price_pence_per_kwh', 'water_price_pence_per_litre'] },
  energy_cost: { label: 'Energy cost', unit: 'GBP', direction: 'asc', requires: ['cycles_per_week', 'ownership_years', 'electricity_price_pence_per_kwh'] },
  water_cost: { label: 'Water cost', unit: 'GBP', direction: 'asc', requires: ['cycles_per_week', 'ownership_years', 'water_price_pence_per_litre'] },
  annual_running_cost: { label: 'Annual running cost', unit: 'GBP/year', direction: 'asc', requires: ['cycles_per_week', 'electricity_price_pence_per_kwh', 'water_price_pence_per_litre'] },
  running_cost_per_cycle: { label: 'Running cost per wash', unit: 'GBP/cycle', direction: 'asc', requires: ['electricity_price_pence_per_kwh', 'water_price_pence_per_litre'] },
  narrowest_clearance_cm: { label: 'Narrowest clearance', unit: 'cm', direction: 'desc', requires: ['opening_width_cm', 'opening_depth_cm', 'opening_height_cm'] },
  delivery_slack_days: { label: 'Delivery slack', unit: 'days', direction: 'desc', requires: ['delivery_within_days'] },
  annual_energy_kwh: { label: 'Annual energy use', unit: 'kWh/year', direction: 'asc', requires: ['cycles_per_week'] },
  annual_water_litres: { label: 'Annual water use', unit: 'litres/year', direction: 'asc', requires: ['cycles_per_week'] },
};

export const defaultDecision: DecisionConfig = {
  id: 'personal-washer-comparison',
  title: 'The machines that fit your home and costs',
  assumptions: {
    opening_width_cm: 60,
    opening_depth_cm: 62,
    opening_height_cm: 85,
    cycles_per_week: 5,
    ownership_years: 8,
    electricity_price_pence_per_kwh: 29,
    water_price_pence_per_litre: .4,
    delivery_within_days: 4,
  },
  requirements: [{ id: 'in_stock' }, { id: 'fits_opening' }, { id: 'delivery_within_days' }],
  visibleMetricIds: ['ownership_cost', 'running_cost_per_cycle', 'narrowest_clearance_cm', 'spin_noise_db', 'delivery_slack_days'],
  primarySort: { metricId: 'ownership_cost', direction: 'asc' },
  tradeoff: { firstMetricId: 'purchase_price', secondMetricId: 'spin_noise_db', secondMetricWeight: .5 },
  plot: { xMetricId: 'purchase_price', yMetricId: 'spin_noise_db', sizeMetricId: 'capacity_kg' },
};

const value = (assumptions: Assumptions, id: NumericAssumptionId, fallback = 0) => assumptions[id] ?? fallback;
const precise = (n: number) => Math.round(n * 10000) / 10000;

export function evaluateProduct(product: Product, config: DecisionConfig): Evaluation {
  const a = config.assumptions;
  const annualCycles = value(a, 'cycles_per_week') * 52;
  const totalCycles = annualCycles * value(a, 'ownership_years');
  const electricityPerKwh = value(a, 'electricity_price_pence_per_kwh') / 100;
  const waterPerLitre = value(a, 'water_price_pence_per_litre') / 100;
  const energyPerCycle = product.energyKwhPer100 / 100;
  const perCycle = precise(energyPerCycle * electricityPerKwh + product.waterLitresPerCycle * waterPerLitre);
  const energyCost = precise(totalCycles * energyPerCycle * electricityPerKwh);
  const waterCost = precise(totalCycles * product.waterLitresPerCycle * waterPerLitre);
  const clearances = {
    width: precise(value(a, 'opening_width_cm', 999) - product.widthCm),
    depth: precise(value(a, 'opening_depth_cm', 999) - product.installedDepthCm),
    height: precise(value(a, 'opening_height_cm', 999) - product.heightCm),
  };
  const reasons: string[] = [];
  const reasonIds: RequirementId[] = [];
  const has = (id: RequirementId) => config.requirements.some((r) => r.id === id);
  if (has('in_stock') && !product.inStock) { reasons.push('Out of stock'); reasonIds.push('in_stock'); }
  if (has('fits_opening')) {
    if (clearances.width < 0) { reasons.push(`${Math.abs(clearances.width).toFixed(1)} cm too wide`); reasonIds.push('fits_opening'); }
    if (clearances.depth < 0) { reasons.push(`${Math.abs(clearances.depth).toFixed(1)} cm too deep installed`); if (!reasonIds.includes('fits_opening')) reasonIds.push('fits_opening'); }
    if (clearances.height < 0) { reasons.push(`${Math.abs(clearances.height).toFixed(1)} cm too tall`); if (!reasonIds.includes('fits_opening')) reasonIds.push('fits_opening'); }
  }
  if (has('delivery_within_days') && product.deliveryDays > value(a, 'delivery_within_days')) { reasons.push(`Arrives ${product.deliveryDays - value(a, 'delivery_within_days')} day${product.deliveryDays - value(a, 'delivery_within_days') === 1 ? '' : 's'} too late`); reasonIds.push('delivery_within_days'); }
  if (has('minimum_capacity_kg') && product.capacityKg < value(a, 'minimum_capacity_kg')) { reasons.push(`Below ${value(a, 'minimum_capacity_kg')} kg capacity`); reasonIds.push('minimum_capacity_kg'); }
  if (has('maximum_purchase_price') && product.price > value(a, 'maximum_purchase_price')) { reasons.push(`£${product.price - value(a, 'maximum_purchase_price')} over budget`); reasonIds.push('maximum_purchase_price'); }
  if (has('machine_type') && a.machine_type && product.type !== a.machine_type) { reasons.push(`Not ${a.machine_type}`); reasonIds.push('machine_type'); }
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
      narrowest_clearance_cm: Math.min(clearances.width, clearances.depth, clearances.height),
      delivery_slack_days: value(a, 'delivery_within_days') - product.deliveryDays,
      annual_energy_kwh: precise(annualCycles * energyPerCycle),
      annual_water_litres: precise(annualCycles * product.waterLitresPerCycle),
    },
  };
}

function normalized(values: number[], current: number, direction: 'asc' | 'desc') {
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min) return 0;
  const raw = (current - min) / (max - min);
  return direction === 'asc' ? raw : 1 - raw;
}

export function rankEvaluations(rows: Evaluation[], config: DecisionConfig, hiddenIds: string[] = []) {
  const visible = rows.filter((row) => row.eligible && !hiddenIds.includes(row.product.id));
  const tradeoff = config.tradeoff;
  const sorted = [...visible].sort((a, b) => {
    if (tradeoff) {
      const first = visible.map((row) => row.metrics[tradeoff.firstMetricId]);
      const second = visible.map((row) => row.metrics[tradeoff.secondMetricId]);
      const aScore = normalized(first, a.metrics[tradeoff.firstMetricId], metricMeta[tradeoff.firstMetricId].direction) * (1 - tradeoff.secondMetricWeight) + normalized(second, a.metrics[tradeoff.secondMetricId], metricMeta[tradeoff.secondMetricId].direction) * tradeoff.secondMetricWeight;
      const bScore = normalized(first, b.metrics[tradeoff.firstMetricId], metricMeta[tradeoff.firstMetricId].direction) * (1 - tradeoff.secondMetricWeight) + normalized(second, b.metrics[tradeoff.secondMetricId], metricMeta[tradeoff.secondMetricId].direction) * tradeoff.secondMetricWeight;
      // Scores this close are functionally the same at the visible control's precision,
      // so the documented ownership-cost tie-breaker keeps usage changes meaningful.
      if (Math.abs(aScore - bScore) > .005) return aScore - bScore;
    } else {
      const dir = config.primarySort.direction === 'asc' ? 1 : -1;
      const diff = (a.metrics[config.primarySort.metricId] - b.metrics[config.primarySort.metricId]) * dir;
      if (diff) return diff;
    }
    const costDiff = a.metrics.ownership_cost - b.metrics.ownership_cost;
    return costDiff || a.product.id.localeCompare(b.product.id);
  });
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function findStrongTradeoffs(rows: Evaluation[], config: DecisionConfig) {
  const { xMetricId: x, yMetricId: y } = config.plot;
  const xDirection = metricMeta[x].direction;
  const yDirection = metricMeta[y].direction;
  const betterOrEqual = (one: number, two: number, direction: 'asc' | 'desc') => direction === 'asc' ? one <= two : one >= two;
  const better = (one: number, two: number, direction: 'asc' | 'desc') => direction === 'asc' ? one < two : one > two;
  return rows.filter((candidate) => !rows.some((other) => other.product.id !== candidate.product.id && betterOrEqual(other.metrics[x], candidate.metrics[x], xDirection) && betterOrEqual(other.metrics[y], candidate.metrics[y], yDirection) && (better(other.metrics[x], candidate.metrics[x], xDirection) || better(other.metrics[y], candidate.metrics[y], yDirection)))).map((row) => row.product.id);
}

export function evaluateCatalog(config: DecisionConfig, hiddenIds: string[] = []) {
  const all = catalog.map((product) => evaluateProduct(product, config));
  const ranked = rankEvaluations(all, config, hiddenIds);
  const strong = findStrongTradeoffs(ranked, config);
  const rankedWithStrong = ranked.map((row) => ({ ...row, strongTradeoff: strong.includes(row.product.id) }));
  const exclusions = all.filter((row) => !row.eligible);
  const counts: Partial<Record<RequirementId | 'multiple', number>> = {};
  for (const row of exclusions) {
    if (row.reasonIds.length > 1) counts.multiple = (counts.multiple ?? 0) + 1;
    for (const id of new Set(row.reasonIds)) counts[id] = (counts[id] ?? 0) + 1;
  }
  return { all, ranked: rankedWithStrong, excluded: exclusions, exclusions: counts, strong };
}

export function findNearestRelaxations(config: DecisionConfig) {
  const a = config.assumptions;
  const candidates: Array<{ id: NumericAssumptionId; label: string; value: number; delta: number; admitted: number; proportional: number }> = [];
  const specs: Array<[NumericAssumptionId, 'max' | 'min', (p: Product) => number]> = [
    ['opening_depth_cm', 'max', (p) => p.installedDepthCm],
    ['opening_width_cm', 'max', (p) => p.widthCm],
    ['opening_height_cm', 'max', (p) => p.heightCm],
    ['delivery_within_days', 'max', (p) => p.deliveryDays],
    ['minimum_capacity_kg', 'min', (p) => p.capacityKg],
    ['maximum_purchase_price', 'max', (p) => p.price],
  ];
  for (const [id, mode, getter] of specs) {
    if (a[id] == null || !config.requirements.some((r) => r.id === (id.startsWith('opening_') ? 'fits_opening' : id))) continue;
    const current = a[id] as number;
    const deltas = catalog.map((p) => mode === 'max' ? getter(p) - current : current - getter(p)).filter((d) => d > 0).sort((x, y) => x - y);
    if (!deltas.length) continue;
    const delta = deltas[0];
    const next = mode === 'max' ? current + delta : current - delta;
    const nextConfig = { ...config, assumptions: { ...a, [id]: next } };
    const admitted = evaluateCatalog(nextConfig).ranked.length;
    if (admitted > 0) candidates.push({ id, label: assumptionMeta[id].label, value: next, delta, admitted, proportional: delta / Math.max(Math.abs(current), 1) });
  }
  return candidates.sort((x, y) => x.proportional - y.proportional || y.admitted - x.admitted || x.label.localeCompare(y.label)).slice(0, 3);
}

export function explainMetric(evaluation: Evaluation, metricId: DerivedMetricId, config: DecisionConfig) {
  const a = config.assumptions;
  const p = evaluation.product;
  const totalCycles = value(a, 'cycles_per_week') * 52 * value(a, 'ownership_years');
  const electricity = totalCycles * (p.energyKwhPer100 / 100) * (value(a, 'electricity_price_pence_per_kwh') / 100);
  const water = totalCycles * p.waterLitresPerCycle * (value(a, 'water_price_pence_per_litre') / 100);
  return {
    productId: p.id,
    model: `${p.brand} ${p.model}`,
    metricId,
    result: evaluation.metrics[metricId],
    purchasePrice: p.price,
    electricityCost: precise(electricity),
    waterCost: precise(water),
    totalCycles,
    productFacts: { energyKwhPer100: p.energyKwhPer100, waterLitresPerCycle: p.waterLitresPerCycle, installedDimensionsCm: `${p.widthCm} × ${p.installedDepthCm} × ${p.heightCm}` },
    assumptions: a,
    exclusions: 'Does not include detergent, repairs, finance, or resale value.',
    estimateBasis: 'Estimated from the Eco 40–60 specification and your current inputs.',
  };
}

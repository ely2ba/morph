import { assumptionMeta, metricMeta } from './decision';

type JsonObject = Record<string, unknown>;
type ToolCallbackOptions = { signal?: AbortSignal };
type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonObject;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean };
  execute: (input: JsonObject, options?: ToolCallbackOptions) => unknown;
};
type ModelContext = { registerTool: (definition: ToolDefinition, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global {
  interface Document { modelContext?: ModelContext }
  interface Navigator { modelContext?: ModelContext }
}

export type WebMcpHandlers = {
  readPage: (input: JsonObject, signal?: AbortSignal) => unknown;
  createDecisionView: (input: JsonObject, signal?: AbortSignal) => unknown;
  updateDecisionView: (input: JsonObject, signal?: AbortSignal) => unknown;
  compareProducts: (input: JsonObject, signal?: AbortSignal) => unknown;
  showCalculation: (input: JsonObject, signal?: AbortSignal) => unknown;
};

const assumptionIds = Object.keys(assumptionMeta);
const metricIds = Object.keys(metricMeta);
const requirementIds = ['in_stock', 'fits_opening', 'delivery_within_days', 'minimum_capacity_kg', 'maximum_purchase_price', 'machine_type'];
const derivedMetricIds = metricIds.filter((id) => !['purchase_price', 'spin_noise_db', 'capacity_kg'].includes(id));
const comparisonRowIds = ['eligible', 'ownership_cost', 'annual_running_cost', 'running_cost_per_cycle', 'physical_clearance', 'delivery_slack', 'capacity', 'energy_per_100', 'water_per_cycle', 'spin_noise', 'spin_speed', 'cycle_duration', 'machine_type', 'installed_dimensions', 'warranty'];

const metricPair = {
  type: 'object',
  properties: {
    first_metric_id: { type: 'string', enum: metricIds },
    second_metric_id: { type: 'string', enum: metricIds },
    second_metric_weight: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['first_metric_id', 'second_metric_id', 'second_metric_weight'],
  additionalProperties: false,
};

const plot = {
  type: 'object',
  properties: {
    x_metric_id: { type: 'string', enum: metricIds },
    y_metric_id: { type: 'string', enum: metricIds },
    size_metric_id: { type: 'string', enum: metricIds },
  },
  required: ['x_metric_id', 'y_metric_id'],
  additionalProperties: false,
};

const definitions = (handlers: WebMcpHandlers): ToolDefinition[] => [
  {
    name: 'read_page',
    title: 'Read washing-machine page',
    description: 'Read this washing-machine page before creating or changing a decision view. Returns supported shopper inputs with exact units and examples, requirements, calculated metrics, current view mode, open calculation, selected comparison rows, current revision, locks, eligible products, shortlist, and hidden products.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false },
    execute: (input, options) => handlers.readPage(input, options?.signal),
  },
  {
    name: 'create_decision_view',
    title: 'Create personal decision view',
    description: 'Create a persistent interactive decision view over every washing machine in this retailer. Call read_page first and use only the supported IDs, units, and value ranges it returns. The retailer computes eligibility and every displayed value from its own catalog. If a view already exists, include its current revision; the new view replaces it while preserving human-owned state.',
    inputSchema: {
      type: 'object',
      properties: {
        base_revision: { type: 'integer', minimum: 0 },
        title: { type: 'string', minLength: 1, maxLength: 70 },
        assumptions: { type: 'object', propertyNames: { enum: assumptionIds }, additionalProperties: { oneOf: [{ type: 'number' }, { type: 'string' }] } },
        requirements: { type: 'array', maxItems: 8, items: { type: 'object', properties: { id: { type: 'string', enum: requirementIds }, value: { oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }] } }, required: ['id'], additionalProperties: false } },
        visible_metric_ids: { type: 'array', minItems: 1, maxItems: 6, uniqueItems: true, items: { type: 'string', enum: metricIds } },
        primary_sort: { type: 'object', properties: { metric_id: { type: 'string', enum: metricIds }, direction: { type: 'string', enum: ['asc', 'desc'] } }, required: ['metric_id', 'direction'], additionalProperties: false },
        tradeoff: metricPair,
        plot,
      },
      required: ['title', 'assumptions', 'requirements', 'visible_metric_ids', 'primary_sort'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
    execute: (input, options) => handlers.createDecisionView(input, options?.signal),
  },
  {
    name: 'update_decision_view',
    title: 'Update personal decision view',
    description: 'Update the active decision view using semantic operations. Call read_page first, then use its revision as base_revision. Locked assumptions, the shopper shortlist, and hidden-product choices are protected. The retailer recomputes all dependent values and rerenders the page.',
    inputSchema: {
      type: 'object',
      properties: {
        base_revision: { type: 'integer', minimum: 0 },
        operations: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'object', properties: { operation: { type: 'string', enum: ['set_title', 'set_assumption', 'remove_assumption', 'add_requirement', 'update_requirement', 'remove_requirement', 'show_metric', 'hide_metric', 'set_primary_sort', 'set_tradeoff', 'clear_tradeoff', 'set_plot_axes'] }, assumption_id: { type: 'string', enum: assumptionIds }, metric_id: { type: 'string', enum: metricIds }, requirement_id: { type: 'string', enum: requirementIds }, value: {}, direction: { type: 'string', enum: ['asc', 'desc'] }, first_metric_id: { type: 'string', enum: metricIds }, second_metric_id: { type: 'string', enum: metricIds }, second_metric_weight: { type: 'number', minimum: 0, maximum: 1 }, x_metric_id: { type: 'string', enum: metricIds }, y_metric_id: { type: 'string', enum: metricIds }, size_metric_id: { type: 'string', enum: metricIds }, title: { type: 'string', minLength: 1, maxLength: 70 } }, required: ['operation'], additionalProperties: false } },
      },
      required: ['base_revision', 'operations'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
    execute: (input, options) => handlers.updateDecisionView(input, options?.signal),
  },
  {
    name: 'compare_products',
    title: 'Compare washing machines',
    description: 'Compare two to four washing machines inside the current decision page. Call read_page first and use its current revision as base_revision. When row_ids is supplied, the page renders exactly those rows in that order; when omitted, it renders personalized rows followed by meaningful differences. The response returns the rows actually rendered.',
    inputSchema: { type: 'object', properties: { base_revision: { type: 'integer', minimum: 0 }, product_ids: { type: 'array', minItems: 2, maxItems: 4, uniqueItems: true, items: { type: 'string' } }, row_ids: { type: 'array', minItems: 1, maxItems: comparisonRowIds.length, uniqueItems: true, items: { type: 'string', enum: comparisonRowIds } } }, required: ['base_revision', 'product_ids'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
    execute: (input, options) => handlers.compareProducts(input, options?.signal),
  },
  {
    name: 'show_calculation',
    title: 'Show calculation',
    description: 'Open the retailer calculation breakdown for one product and one active calculated metric. Returns and visibly shows the shopper inputs, product facts, formula components, result, and exclusions.',
    inputSchema: { type: 'object', properties: { base_revision: { type: 'integer', minimum: 0 }, product_id: { type: 'string' }, metric_id: { type: 'string', enum: derivedMetricIds } }, required: ['base_revision', 'product_id', 'metric_id'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
    execute: (input, options) => handlers.showCalculation(input, options?.signal),
  },
];

export function registerDecisionTools(handlers: WebMcpHandlers) {
  const modelContext = document.modelContext ?? navigator.modelContext;
  if (!modelContext?.registerTool) return { available: false, abort: () => undefined };
  const controller = new AbortController();
  void (async () => {
    for (const definition of definitions(handlers)) {
      await Promise.resolve(modelContext.registerTool(definition, { signal: controller.signal }));
    }
  })().catch((error) => {
    if (!controller.signal.aborted) console.warn('Could not register the washing-machine WebMCP tools', error);
  });
  return { available: true, abort: () => controller.abort() };
}

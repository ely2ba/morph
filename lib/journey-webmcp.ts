import {
  journeyCalculationMetricIds,
  type JourneyMetricId,
  type JourneyRequirementId,
} from "./journeys";

type JsonObject = Record<string, unknown>;
type ToolCallbackOptions = { signal?: AbortSignal };
type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObject;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
    consequentialHint: boolean;
  };
  execute: (input: JsonObject, options?: ToolCallbackOptions) => unknown;
};
type ModelContext = {
  registerTool: (
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export type JourneyWebMcpHandlers = {
  readPage: (input: JsonObject, signal?: AbortSignal) => unknown;
  createJourneyView: (input: JsonObject, signal?: AbortSignal) => unknown;
  updateJourneyView: (input: JsonObject, signal?: AbortSignal) => unknown;
  compareJourneys: (input: JsonObject, signal?: AbortSignal) => unknown;
  showJourneyCalculation: (input: JsonObject, signal?: AbortSignal) => unknown;
};

const metricIds: JourneyMetricId[] = [
  "door_to_door_time",
  "walking_distance",
  "disruption_risk",
  "arrival_slack",
  "fare",
  "carbon",
  "advertised_duration",
];
const requirementIds: JourneyRequirementId[] = [
  "arrive_by",
  "minimum_connection_slack",
  "step_free",
  "direct_only",
];
const comparisonRows = [
  "door_to_door_time",
  "advertised_duration",
  "walking_distance",
  "disruption_risk",
  "arrival_slack",
  "fare",
  "carbon",
  "connections",
  "luggage",
  "punctuality",
  "accessibility",
];
const annotations = {
  readOnlyHint: false,
  untrustedContentHint: false,
  consequentialHint: false,
};

const assumptionsSchema = {
  type: "object",
  properties: {
    origin: { type: "string", enum: ["shoreditch", "camden", "canary_wharf"] },
    destination: {
      type: "string",
      enum: ["jordaan", "de_pijp", "museum_quarter"],
    },
    checked_bag: { type: "boolean" },
    arrival_deadline_minutes: { type: "integer", minimum: 600, maximum: 1439 },
    minimum_connection_slack_minutes: {
      type: "integer",
      minimum: 0,
      maximum: 120,
    },
    reliability_weight: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "origin",
    "destination",
    "checked_bag",
    "arrival_deadline_minutes",
    "minimum_connection_slack_minutes",
    "reliability_weight",
  ],
  additionalProperties: false,
};

function definitions(handlers: JourneyWebMcpHandlers): ToolDefinition[] {
  return [
    {
      name: "read_page",
      title: "Read Wayline journey page",
      description:
        "Read this Wayline page before creating or changing a journey view. Returns site-owned assumptions, constraints, metric definitions, itinerary facts, current revision, locks, saved and hidden journeys, comparison state, and any open calculation.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { ...annotations, readOnlyHint: true },
      execute: (input, options) => handlers.readPage(input, options?.signal),
    },
    {
      name: "create_journey_view",
      title: "Create door-to-door journey view",
      description:
        "Transform the conventional results into a persistent Wayline decision view. Use only the supported site-owned fields returned by read_page. Wayline calculates eligibility, arrival, door-to-door time, risk, ranking, and rendering; callers cannot provide formulas, HTML, URLs, or claims. Include base_revision if a view already exists.",
      inputSchema: {
        type: "object",
        properties: {
          base_revision: { type: "integer", minimum: 0 },
          assumptions: assumptionsSchema,
          requirements: {
            type: "array",
            maxItems: requirementIds.length,
            uniqueItems: true,
            items: { type: "string", enum: requirementIds },
          },
          visible_metric_ids: {
            type: "array",
            minItems: 1,
            maxItems: 7,
            uniqueItems: true,
            items: { type: "string", enum: metricIds },
          },
          primary_sort: {
            type: "object",
            properties: {
              metric_id: { type: "string", enum: metricIds },
              direction: { type: "string", enum: ["asc", "desc"] },
            },
            required: ["metric_id", "direction"],
            additionalProperties: false,
          },
        },
        required: [
          "assumptions",
          "requirements",
          "visible_metric_ids",
          "primary_sort",
        ],
        additionalProperties: false,
      },
      annotations,
      execute: (input, options) =>
        handlers.createJourneyView(input, options?.signal),
    },
    {
      name: "update_journey_view",
      title: "Update current journey view",
      description:
        "Update the active journey view with safe semantic operations. Call read_page first and pass its revision. Human locks, saved journeys, hidden journeys, and comparison choices are preserved.",
      inputSchema: {
        type: "object",
        properties: {
          base_revision: { type: "integer", minimum: 0 },
          operations: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            items: {
              oneOf: [
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_origin" },
                    value: {
                      type: "string",
                      enum: ["shoreditch", "camden", "canary_wharf"],
                    },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_destination" },
                    value: {
                      type: "string",
                      enum: ["jordaan", "de_pijp", "museum_quarter"],
                    },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_checked_bag" },
                    value: { type: "boolean" },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_arrival_deadline" },
                    value: { type: "integer", minimum: 600, maximum: 1439 },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_minimum_connection_slack" },
                    value: { type: "integer", minimum: 0, maximum: 120 },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_reliability_weight" },
                    value: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["operation", "value"],
                  additionalProperties: false,
                },
                ...["add_requirement", "remove_requirement"].map(
                  (operation) => ({
                    type: "object",
                    properties: {
                      operation: { const: operation },
                      requirement_id: {
                        type: "string",
                        enum: requirementIds,
                      },
                    },
                    required: ["operation", "requirement_id"],
                    additionalProperties: false,
                  }),
                ),
                ...["show_metric", "hide_metric"].map((operation) => ({
                  type: "object",
                  properties: {
                    operation: { const: operation },
                    metric_id: { type: "string", enum: metricIds },
                  },
                  required: ["operation", "metric_id"],
                  additionalProperties: false,
                })),
                {
                  type: "object",
                  properties: {
                    operation: { const: "set_primary_sort" },
                    metric_id: { type: "string", enum: metricIds },
                    direction: { type: "string", enum: ["asc", "desc"] },
                  },
                  required: ["operation", "metric_id", "direction"],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        required: ["base_revision", "operations"],
        additionalProperties: false,
      },
      annotations,
      execute: (input, options) =>
        handlers.updateJourneyView(input, options?.signal),
    },
    {
      name: "compare_journeys",
      title: "Compare Wayline journeys",
      description:
        "Compare two to four journeys in the current transformed page. Optionally choose exact site-defined rows and their order. Hidden journeys remain protected.",
      inputSchema: {
        type: "object",
        properties: {
          base_revision: { type: "integer", minimum: 0 },
          journey_ids: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            uniqueItems: true,
            items: { type: "string" },
          },
          row_ids: {
            type: "array",
            minItems: 1,
            maxItems: comparisonRows.length,
            uniqueItems: true,
            items: { type: "string", enum: comparisonRows },
          },
        },
        required: ["base_revision", "journey_ids"],
        additionalProperties: false,
      },
      annotations,
      execute: (input, options) =>
        handlers.compareJourneys(input, options?.signal),
    },
    {
      name: "show_journey_calculation",
      title: "Explain a Wayline calculation",
      description:
        "Open the exact Wayline-owned component calculation for door-to-door time, local arrival, walking distance, disruption risk, or arrival slack. Returns the same inputs, facts, arithmetic, and exclusions shown on the page.",
      inputSchema: {
        type: "object",
        properties: {
          base_revision: { type: "integer", minimum: 0 },
          journey_id: { type: "string" },
          metric_id: {
            type: "string",
            enum: journeyCalculationMetricIds,
          },
        },
        required: ["base_revision", "journey_id", "metric_id"],
        additionalProperties: false,
      },
      annotations,
      execute: (input, options) =>
        handlers.showJourneyCalculation(input, options?.signal),
    },
  ];
}

export function registerJourneyTools(handlers: JourneyWebMcpHandlers) {
  const modelContext =
    (document as Document & { modelContext?: ModelContext }).modelContext ??
    (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  if (!modelContext?.registerTool)
    return { available: false, abort: () => undefined };
  const controller = new AbortController();
  void (async () => {
    for (const definition of definitions(handlers))
      await Promise.resolve(
        modelContext.registerTool(definition, { signal: controller.signal }),
      );
  })().catch((error) => {
    if (!controller.signal.aborted)
      console.warn("Could not register Wayline WebMCP tools", error);
  });
  return { available: true, abort: () => controller.abort() };
}

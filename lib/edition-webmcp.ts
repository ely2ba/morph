import {
  articles,
  clusters,
  type BackgroundMode,
  type MinimumId,
  type TopicId,
} from './edition';
import {
  compositionOperationSchemas,
  editionComponentTypes,
  editionGroupingIds,
  nativeComponentInputSchema,
} from './composition';

type JsonObject = Record<string, unknown>;
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
  execute: (input: JsonObject, options?: { signal?: AbortSignal }) => unknown;
};
type ModelContext = {
  registerTool: (
    definition: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export type EditionWebMcpHandlers = {
  readPage: (input: JsonObject, signal?: AbortSignal) => unknown;
  createEdition: (input: JsonObject, signal?: AbortSignal) => unknown;
  updateEdition: (input: JsonObject, signal?: AbortSignal) => unknown;
  compareCoverage: (input: JsonObject, signal?: AbortSignal) => unknown;
  showSelectionReason: (input: JsonObject, signal?: AbortSignal) => unknown;
};

const topicIds: TopicId[] = [
  'uk',
  'world',
  'science',
  'local',
  'technology',
  'culture',
  'business',
  'sport',
  'celebrity',
];
const minimumIds: MinimumId[] = ['uk', 'world', 'science', 'local'];
const backgroundModes: BackgroundMode[] = [
  'omit',
  'include_free',
  'include_counted',
];
const editionRecordIds = [
  ...clusters.map((cluster) => cluster.id),
  ...articles.map((article) => article.id),
];
const componentSchema = nativeComponentInputSchema(
  editionComponentTypes,
  [
    'reading_time',
    'novel_facts',
    'original_reporting',
    'publication_order',
    'topic',
  ],
  {
    allowedRecordIds: editionRecordIds,
    allowedAssumptionIds: [
      'budget_seconds',
      'topic_policies',
      'minimums',
      'original_reporting_weight',
      'background_mode',
    ],
    allowedGroupIds: editionGroupingIds,
    maximumRecords: editionRecordIds.length,
  },
);
const mutableAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: false,
  consequentialHint: false,
};
const minimumSchema = {
  type: 'object',
  properties: Object.fromEntries(
    minimumIds.map((id) => [id, { type: 'integer', minimum: 0, maximum: 5 }]),
  ),
  required: minimumIds,
  additionalProperties: false,
};

function definitions(handlers: EditionWebMcpHandlers): ToolDefinition[] {
  return [
    {
      name: 'read_page',
      title: 'Read The Current newsroom page',
      description:
        'Read this page before composing or changing an interface. Returns the fixed newsroom dataset, verified facts and provenance; the native component vocabulary and current ordered composition; supported actions; revision; locks, pins, hidden sources, comparison state; and exact relaxations.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { ...mutableAnnotations, readOnlyHint: true },
      execute: (input, options) => handlers.readPage(input, options?.signal),
    },
    {
      name: 'create_edition',
      title: 'Create a finite news edition',
      description:
        'Turn the conventional Current homepage into a finite source-preserving edition. Components can independently select facts and metrics, group coverage, set their own sort, and emphasize supported stories, articles or metrics. The site alone clusters coverage, chooses verified facts, preserves original reporting, enforces topic minimums, calculates reading time, and renders the result. No caller-authored summaries, claims, HTML, formulas, or URLs are accepted.',
      inputSchema: {
        type: 'object',
        properties: {
          base_revision: { type: 'integer', minimum: 0 },
          budget_seconds: { type: 'integer', minimum: 300, maximum: 1200 },
          excluded_topic_ids: {
            type: 'array',
            uniqueItems: true,
            items: { type: 'string', enum: topicIds },
          },
          minimums: minimumSchema,
          original_reporting_weight: { type: 'number', minimum: 0, maximum: 1 },
          background_mode: { type: 'string', enum: backgroundModes },
          components: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: componentSchema,
          },
        },
        required: [
          'budget_seconds',
          'excluded_topic_ids',
          'minimums',
          'original_reporting_weight',
          'background_mode',
          'components',
        ],
        additionalProperties: false,
      },
      annotations: mutableAnnotations,
      execute: (input, options) =>
        handlers.createEdition(input, options?.signal),
    },
    {
      name: 'update_edition',
      title: 'Update the current edition',
      description:
        'Recompose The Current in place or apply safe editorial controls. Native components can be replaced, added, removed, moved, grouped, sorted and emphasized independently. configure_component accepts only the settings to change; do not repeat its component ID inside the patch. Call read_page first. Human topic locks, field locks, pinned developments and hidden publications remain protected unless their exact semantic operation is requested.',
      inputSchema: {
        type: 'object',
        properties: {
          base_revision: { type: 'integer', minimum: 0 },
          operations: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              oneOf: [
                ...compositionOperationSchemas(componentSchema),
                {
                  type: 'object',
                  properties: {
                    operation: { const: 'set_budget_seconds' },
                    value: { type: 'integer', minimum: 300, maximum: 1200 },
                  },
                  required: ['operation', 'value'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: {
                      type: 'string',
                      enum: ['pin_story', 'unpin_story'],
                    },
                    cluster_id: { type: 'string' },
                  },
                  required: ['operation', 'cluster_id'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: {
                      type: 'string',
                      enum: ['hide_source', 'restore_source'],
                    },
                    publication: { type: 'string' },
                  },
                  required: ['operation', 'publication'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: {
                      type: 'string',
                      enum: ['lock_topic', 'unlock_topic'],
                    },
                    topic_id: { type: 'string', enum: topicIds },
                  },
                  required: ['operation', 'topic_id'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: {
                      type: 'string',
                      enum: ['lock_field', 'unlock_field'],
                    },
                    field_id: {
                      type: 'string',
                      enum: [
                        'budget_seconds',
                        'minimums',
                        'original_reporting_weight',
                        'background_mode',
                      ],
                    },
                  },
                  required: ['operation', 'field_id'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: { const: 'set_topic_policy' },
                    topic_id: { type: 'string', enum: topicIds },
                    policy: { type: 'string', enum: ['include', 'exclude'] },
                  },
                  required: ['operation', 'topic_id', 'policy'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: { const: 'set_minimum' },
                    minimum_id: { type: 'string', enum: minimumIds },
                    value: { type: 'integer', minimum: 0, maximum: 5 },
                  },
                  required: ['operation', 'minimum_id', 'value'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: { const: 'set_original_reporting_weight' },
                    value: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: ['operation', 'value'],
                  additionalProperties: false,
                },
                {
                  type: 'object',
                  properties: {
                    operation: { const: 'set_background_mode' },
                    value: { type: 'string', enum: backgroundModes },
                  },
                  required: ['operation', 'value'],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        required: ['base_revision', 'operations'],
        additionalProperties: false,
      },
      annotations: mutableAnnotations,
      execute: (input, options) =>
        handlers.updateEdition(input, options?.signal),
    },
    {
      name: 'compare_coverage',
      title: 'Compare coverage provenance',
      description:
        'Compare two to five visible articles about one underlying story. The Current shows shared facts, unique facts, publication order, original reporting, rewrites, follow-ups, and what genuinely changed.',
      inputSchema: {
        type: 'object',
        properties: {
          base_revision: { type: 'integer', minimum: 0 },
          cluster_id: { type: 'string' },
          article_ids: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            uniqueItems: true,
            items: { type: 'string' },
          },
        },
        required: ['base_revision', 'cluster_id'],
        additionalProperties: false,
      },
      annotations: mutableAnnotations,
      execute: (input, options) =>
        handlers.compareCoverage(input, options?.signal),
    },
    {
      name: 'show_selection_reason',
      title: 'Explain an edition selection',
      description:
        'Open the exact site-owned reason a selected development fits this edition, including budget arithmetic, topic requirements, novel fact IDs, original-reporting status, and displaced duplicate coverage.',
      inputSchema: {
        type: 'object',
        properties: {
          base_revision: { type: 'integer', minimum: 0 },
          cluster_id: { type: 'string' },
        },
        required: ['base_revision', 'cluster_id'],
        additionalProperties: false,
      },
      annotations: mutableAnnotations,
      execute: (input, options) =>
        handlers.showSelectionReason(input, options?.signal),
    },
  ];
}

export function registerEditionTools(handlers: EditionWebMcpHandlers) {
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
      console.warn('Could not register The Current WebMCP tools', error);
  });
  return { available: true, abort: () => controller.abort() };
}

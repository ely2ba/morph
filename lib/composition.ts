export const componentVariants = [
  'default',
  'compact',
  'detailed',
  'simple',
  'differences_only',
  'new_only',
  'stress_test',
] as const;

export type ComponentVariant = (typeof componentVariants)[number];

export const washerComponentTypes = [
  'decision_summary',
  'missing_questions',
  'assumptions',
  'metric_strip',
  'ranked_cards',
  'compact_table',
  'comparison',
  'scatter_plot',
  'tradeoff_board',
  'cost_breakdown',
  'calculation_explanation',
  'delivery_calendar',
  'recommendation',
  'checklist',
  'exclusions',
  'relaxations',
] as const;

export const journeyComponentTypes = [
  'decision_summary',
  'assumptions',
  'metric_strip',
  'ranked_cards',
  'compact_table',
  'comparison',
  'journey_timeline',
  'chronological_itinerary',
  'scatter_plot',
  'tradeoff_board',
  'delay_stress_test',
  'day_plan',
  'cost_breakdown',
  'calculation_explanation',
  'checklist',
  'exclusions',
  'relaxations',
] as const;

export const washerGroupingIds = [
  'none',
  'eligibility',
  'machine_type',
  'brand',
  'delivery_day',
  'price_band',
] as const;

export const journeyGroupingIds = [
  'none',
  'mode',
  'step_free',
  'directness',
  'departure_period',
] as const;

export const editionGroupingIds = [
  'none',
  'topic',
  'publication',
  'story_cluster',
  'chronology',
] as const;

export const editionComponentTypes = [
  'decision_summary',
  'assumptions',
  'metric_strip',
  'finite_edition',
  'chronological_timeline',
  'provenance_map',
  'repeated_coverage',
  'disagreement_board',
  'reading_queue',
  'topic_dashboard',
  'comparison',
  'selection_explanation',
  'background_material',
  'checklist',
  'relaxations',
] as const;

export type NativeComponent = {
  id: string;
  type: string;
  heading?: string;
  variant?: ComponentVariant;
  metricIds?: string[];
  recordIds?: string[];
  assumptionIds?: string[];
  groupBy?: string;
  sortMetricId?: string;
  sortDirection?: 'asc' | 'desc';
  emphasizedRecordIds?: string[];
  emphasizedMetricIds?: string[];
  width?: 'full' | 'half';
  limit?: number;
  delayMinutes?: number;
  showOnlyDifferences?: boolean;
};

export type ComponentParseOptions = {
  allowedTypes: readonly string[];
  allowedMetricIds?: readonly string[];
  allowedRecordIds?: readonly string[];
  allowedAssumptionIds?: readonly string[];
  allowedGroupIds?: readonly string[];
  allowedVariantsByType?: Readonly<
    Record<string, readonly ComponentVariant[]>
  >;
  maximumRecords?: number;
  supportedFields?: readonly NativeComponentFieldId[];
  supportedFieldsByType?: Readonly<
    Record<string, readonly NativeComponentFieldId[]>
  >;
};

export type NativeComponentPatch = Partial<Omit<NativeComponent, 'id'>>;

export type NativeComponentFieldId =
  | 'heading'
  | 'variant'
  | 'metric_ids'
  | 'record_ids'
  | 'assumption_ids'
  | 'group_by'
  | 'sort_metric_id'
  | 'sort_direction'
  | 'emphasized_record_ids'
  | 'emphasized_metric_ids'
  | 'width'
  | 'limit'
  | 'delay_minutes'
  | 'show_only_differences';

export type ComponentSchemaOptions = Pick<
  ComponentParseOptions,
  | 'allowedRecordIds'
  | 'allowedAssumptionIds'
  | 'allowedGroupIds'
  | 'allowedVariantsByType'
  | 'maximumRecords'
  | 'supportedFields'
  | 'supportedFieldsByType'
>;

const componentFieldAliases: Record<NativeComponentFieldId, string[]> = {
  heading: ['heading'],
  variant: ['variant'],
  metric_ids: ['metric_ids', 'metricIds'],
  record_ids: ['record_ids', 'recordIds'],
  assumption_ids: ['assumption_ids', 'assumptionIds'],
  group_by: ['group_by', 'groupBy'],
  sort_metric_id: ['sort_metric_id', 'sortMetricId'],
  sort_direction: ['sort_direction', 'sortDirection'],
  emphasized_record_ids: ['emphasized_record_ids', 'emphasizedRecordIds'],
  emphasized_metric_ids: ['emphasized_metric_ids', 'emphasizedMetricIds'],
  width: ['width'],
  limit: ['limit'],
  delay_minutes: ['delay_minutes', 'delayMinutes'],
  show_only_differences: ['show_only_differences', 'showOnlyDifferences'],
};

const componentIdPattern = /^[a-z][a-z0-9_-]{0,39}$/;

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStringArray(
  raw: unknown,
  allowed: readonly string[] | undefined,
  field: string,
  maximum = 12,
) {
  if (raw == null) return undefined;
  if (
    !Array.isArray(raw) ||
    raw.length > maximum ||
    new Set(raw).size !== raw.length ||
    raw.some((value) => typeof value !== 'string')
  )
    throw new Error(`${field} must contain unique supported IDs.`);
  const values = raw as string[];
  if (allowed && values.some((value) => !allowed.includes(value)))
    throw new Error(`${field} contains an unsupported ID.`);
  return values;
}

export function parseNativeComponent(
  value: unknown,
  options: ComponentParseOptions,
): NativeComponent {
  const raw = asPlainObject(value);
  if (!raw) throw new Error('Each component must be an object.');
  const id = typeof raw.id === 'string' ? raw.id : '';
  const type = typeof raw.type === 'string' ? raw.type : '';
  if (!componentIdPattern.test(id))
    throw new Error(
      'Component IDs must start with a letter and use at most 40 lowercase letters, numbers, dashes, or underscores.',
    );
  if (!options.allowedTypes.includes(type))
    throw new Error(`Unsupported component type “${type}”.`);
  const supportedFields = options.supportedFieldsByType
    ? (options.supportedFieldsByType[type] ?? [])
    : options.supportedFields;
  if (supportedFields) {
    const allowedKeys = new Set([
      'id',
      'type',
      ...supportedFields.flatMap((field) => componentFieldAliases[field]),
    ]);
    const unsupported = Object.keys(raw).find((key) => !allowedKeys.has(key));
    if (unsupported)
      throw new Error(
        `Component field “${unsupported}” is not supported by ${type}.`,
      );
  }

  const component: NativeComponent = { id, type };
  if (raw.heading != null) {
    if (typeof raw.heading !== 'string')
      throw new Error('Component headings must be plain text.');
    const heading = raw.heading.trim();
    if (!heading || heading.length > 80 || /[<>\r\n]/.test(heading))
      throw new Error(
        'Component headings must be 1–80 characters of plain text.',
      );
    component.heading = heading;
  }
  if (raw.variant != null) {
    if (typeof raw.variant !== 'string')
      throw new Error('Component variant must be a supported ID.');
    const variant = raw.variant as ComponentVariant;
    const allowedVariants =
      options.allowedVariantsByType?.[type] ?? componentVariants;
    if (!allowedVariants.includes(variant))
      throw new Error(`Unsupported component variant “${variant}”.`);
    component.variant = variant;
  }
  const metricIds = readStringArray(
    raw.metric_ids ?? raw.metricIds,
    options.allowedMetricIds,
    'metric_ids',
  );
  if (metricIds) component.metricIds = metricIds;
  const recordIds = readStringArray(
    raw.record_ids ?? raw.recordIds,
    options.allowedRecordIds,
    'record_ids',
    options.maximumRecords ?? 28,
  );
  if (recordIds) component.recordIds = recordIds;
  const assumptionIds = readStringArray(
    raw.assumption_ids ?? raw.assumptionIds,
    options.allowedAssumptionIds,
    'assumption_ids',
    20,
  );
  if (assumptionIds) component.assumptionIds = assumptionIds;
  if (raw.group_by != null || raw.groupBy != null) {
    const groupBy = raw.group_by ?? raw.groupBy;
    if (typeof groupBy !== 'string')
      throw new Error('group_by must be a supported grouping ID.');
    if (options.allowedGroupIds && !options.allowedGroupIds.includes(groupBy))
      throw new Error(`Unsupported grouping “${groupBy}”.`);
    component.groupBy = groupBy;
  }
  if (raw.sort_metric_id != null || raw.sortMetricId != null) {
    const sortMetricId = raw.sort_metric_id ?? raw.sortMetricId;
    if (typeof sortMetricId !== 'string')
      throw new Error('sort_metric_id must be a supported metric ID.');
    if (
      options.allowedMetricIds &&
      !options.allowedMetricIds.includes(sortMetricId)
    )
      throw new Error(`Unsupported sort metric “${sortMetricId}”.`);
    component.sortMetricId = sortMetricId;
  }
  if (raw.sort_direction != null || raw.sortDirection != null) {
    const sortDirection = (raw.sort_direction ?? raw.sortDirection) as
      | 'asc'
      | 'desc';
    if (typeof sortDirection !== 'string')
      throw new Error('sort_direction must be asc or desc.');
    if (!(['asc', 'desc'] as const).includes(sortDirection))
      throw new Error('sort_direction must be asc or desc.');
    component.sortDirection = sortDirection;
  }
  if ((component.sortMetricId == null) !== (component.sortDirection == null))
    throw new Error(
      'sort_metric_id and sort_direction must be supplied together.',
    );
  const emphasizedRecordIds = readStringArray(
    raw.emphasized_record_ids ?? raw.emphasizedRecordIds,
    options.allowedRecordIds,
    'emphasized_record_ids',
    options.maximumRecords ?? 28,
  );
  if (emphasizedRecordIds) component.emphasizedRecordIds = emphasizedRecordIds;
  const emphasizedMetricIds = readStringArray(
    raw.emphasized_metric_ids ?? raw.emphasizedMetricIds,
    options.allowedMetricIds,
    'emphasized_metric_ids',
  );
  if (emphasizedMetricIds) component.emphasizedMetricIds = emphasizedMetricIds;
  if (raw.width != null) {
    if (typeof raw.width !== 'string')
      throw new Error('Component width must be full or half.');
    const width = raw.width as 'full' | 'half';
    if (!(['full', 'half'] as const).includes(width))
      throw new Error('Component width must be full or half.');
    component.width = width;
  }
  if (raw.limit != null) {
    const limit = Number(raw.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 30)
      throw new Error('Component limit must be an integer from 1 to 30.');
    component.limit = limit;
  }
  if (raw.delay_minutes != null || raw.delayMinutes != null) {
    const delayMinutes = Number(raw.delay_minutes ?? raw.delayMinutes);
    if (
      !Number.isInteger(delayMinutes) ||
      delayMinutes < 0 ||
      delayMinutes > 180
    )
      throw new Error('Delay minutes must be an integer from 0 to 180.');
    component.delayMinutes = delayMinutes;
  }
  if (raw.show_only_differences != null || raw.showOnlyDifferences != null) {
    const showOnlyDifferences =
      raw.show_only_differences ?? raw.showOnlyDifferences;
    if (typeof showOnlyDifferences !== 'boolean')
      throw new Error('show_only_differences must be boolean.');
    component.showOnlyDifferences = showOnlyDifferences;
  }
  return component;
}

export function parseNativeComponentPatch(
  value: unknown,
  options: ComponentParseOptions,
): NativeComponentPatch {
  const raw = asPlainObject(value);
  if (!raw) throw new Error('Component settings must be an object.');
  if (Object.keys(raw).length === 0)
    throw new Error('Choose at least one component setting to change.');

  const seedId = 'component_patch';
  const seedType = options.allowedTypes[0];
  if (!seedType) throw new Error('No native component types are available.');
  const suppliedSortMetric =
    raw.sort_metric_id != null || raw.sortMetricId != null;
  const suppliedSortDirection =
    raw.sort_direction != null || raw.sortDirection != null;
  const seedSortMetric = options.allowedMetricIds?.[0];
  if (suppliedSortDirection && !suppliedSortMetric && !seedSortMetric)
    throw new Error('No supported sort metric is available.');
  const parsed = parseNativeComponent(
    {
      id: seedId,
      type: seedType,
      ...raw,
      ...(raw.id == null ? { id: seedId } : {}),
      ...(raw.type == null ? { type: seedType } : {}),
      ...(suppliedSortMetric && !suppliedSortDirection
        ? { sort_direction: 'asc' }
        : {}),
      ...(suppliedSortDirection && !suppliedSortMetric
        ? { sort_metric_id: seedSortMetric }
        : {}),
    },
    options,
  );
  const { id: _ignoredId, type: parsedType, ...settings } = parsed;
  if (!suppliedSortMetric) delete settings.sortMetricId;
  if (!suppliedSortDirection) delete settings.sortDirection;
  const patch = raw.type == null ? settings : { ...settings, type: parsedType };
  if (Object.keys(patch).length === 0)
    throw new Error('Choose at least one component setting to change.');
  return patch;
}

export function parseComposition(
  value: unknown,
  options: ComponentParseOptions,
): NativeComponent[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16)
    throw new Error('Choose one to sixteen native page components.');
  const components = value.map((item) => parseNativeComponent(item, options));
  if (new Set(components.map((item) => item.id)).size !== components.length)
    throw new Error('Every component ID must be unique.');
  return components;
}

export function cloneComposition(
  components: NativeComponent[],
): NativeComponent[] {
  return components.map((component) => ({
    ...component,
    metricIds: component.metricIds ? [...component.metricIds] : undefined,
    recordIds: component.recordIds ? [...component.recordIds] : undefined,
    assumptionIds: component.assumptionIds
      ? [...component.assumptionIds]
      : undefined,
    emphasizedRecordIds: component.emphasizedRecordIds
      ? [...component.emphasizedRecordIds]
      : undefined,
    emphasizedMetricIds: component.emphasizedMetricIds
      ? [...component.emphasizedMetricIds]
      : undefined,
  }));
}

export function moveComponent(
  components: NativeComponent[],
  componentId: string,
  position: number,
) {
  const index = components.findIndex((item) => item.id === componentId);
  if (index < 0) throw new Error(`Unknown component “${componentId}”.`);
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position >= components.length
  )
    throw new Error('Component position is outside the current layout.');
  const next = cloneComposition(components);
  const [component] = next.splice(index, 1);
  next.splice(position, 0, component);
  return next;
}

export function insertComponent(
  components: NativeComponent[],
  component: NativeComponent,
  position?: number,
) {
  if (components.length >= 16)
    throw new Error('A composed page can contain at most sixteen components.');
  if (components.some((item) => item.id === component.id))
    throw new Error(`Component ID “${component.id}” is already in use.`);
  const next = cloneComposition(components);
  const index = position == null ? next.length : Number(position);
  if (!Number.isInteger(index) || index < 0 || index > next.length)
    throw new Error('Component position is outside the current layout.');
  next.splice(index, 0, component);
  return next;
}

export function removeComponent(
  components: NativeComponent[],
  componentId: string,
) {
  if (!components.some((item) => item.id === componentId))
    throw new Error(`Unknown component “${componentId}”.`);
  if (components.length === 1)
    throw new Error('A composed page must keep at least one component.');
  return components.filter((item) => item.id !== componentId);
}

export function configureComponent(
  components: NativeComponent[],
  componentId: string,
  patch: NativeComponentPatch | NativeComponent,
) {
  if (!components.some((item) => item.id === componentId))
    throw new Error(`Unknown component “${componentId}”.`);
  return components.map((item) =>
    item.id === componentId ? { ...item, ...patch, id: item.id } : item,
  );
}

export function serializeComposition(components: NativeComponent[]) {
  return components.map((component) => ({
    id: component.id,
    type: component.type,
    ...(component.heading ? { heading: component.heading } : {}),
    ...(component.variant ? { variant: component.variant } : {}),
    ...(component.metricIds ? { metric_ids: component.metricIds } : {}),
    ...(component.recordIds ? { record_ids: component.recordIds } : {}),
    ...(component.assumptionIds
      ? { assumption_ids: component.assumptionIds }
      : {}),
    ...(component.groupBy ? { group_by: component.groupBy } : {}),
    ...(component.sortMetricId
      ? { sort_metric_id: component.sortMetricId }
      : {}),
    ...(component.sortDirection
      ? { sort_direction: component.sortDirection }
      : {}),
    ...(component.emphasizedRecordIds
      ? { emphasized_record_ids: component.emphasizedRecordIds }
      : {}),
    ...(component.emphasizedMetricIds
      ? { emphasized_metric_ids: component.emphasizedMetricIds }
      : {}),
    ...(component.width ? { width: component.width } : {}),
    ...(component.limit ? { limit: component.limit } : {}),
    ...(component.delayMinutes != null
      ? { delay_minutes: component.delayMinutes }
      : {}),
    ...(component.showOnlyDifferences != null
      ? { show_only_differences: component.showOnlyDifferences }
      : {}),
  }));
}

export function nativeComponentInputSchema(
  allowedTypes: readonly string[],
  allowedMetricIds: readonly string[] = [],
  options: ComponentSchemaOptions = {},
) {
  const recordIdSchema = options.allowedRecordIds
    ? { type: 'string', enum: options.allowedRecordIds }
    : { type: 'string' };
  const assumptionIdSchema = options.allowedAssumptionIds
    ? { type: 'string', enum: options.allowedAssumptionIds }
    : { type: 'string' };
  const groupIdSchema = options.allowedGroupIds
    ? { type: 'string', enum: options.allowedGroupIds }
    : { type: 'string' };
  const allProperties = {
    id: {
      type: 'string',
      pattern: '^[a-z][a-z0-9_-]{0,39}$',
    },
    type: { type: 'string', enum: allowedTypes },
    heading: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      pattern: '^[^<>\\r\\n]+$',
    },
    variant: { type: 'string', enum: componentVariants },
    metric_ids: {
      type: 'array',
      maxItems: 12,
      uniqueItems: true,
      items: { type: 'string', enum: allowedMetricIds },
    },
    record_ids: {
      type: 'array',
      maxItems: options.maximumRecords ?? 30,
      uniqueItems: true,
      items: recordIdSchema,
    },
    assumption_ids: {
      type: 'array',
      maxItems: 20,
      uniqueItems: true,
      items: assumptionIdSchema,
    },
    group_by: {
      ...groupIdSchema,
      description:
        'Site-defined grouping for this component; use none for an ungrouped view.',
    },
    sort_metric_id: {
      type: 'string',
      enum: allowedMetricIds,
      description: 'Site-defined metric used to sort this component.',
    },
    sort_direction: {
      type: 'string',
      enum: ['asc', 'desc'],
      description: 'Direction for sort_metric_id.',
    },
    emphasized_record_ids: {
      type: 'array',
      maxItems: options.maximumRecords ?? 30,
      uniqueItems: true,
      items: recordIdSchema,
      description:
        'Site-owned records to emphasize without hiding other records.',
    },
    emphasized_metric_ids: {
      type: 'array',
      maxItems: 12,
      uniqueItems: true,
      items: { type: 'string', enum: allowedMetricIds },
      description:
        'Site-owned metrics to emphasize without hiding other metrics.',
    },
    width: { type: 'string', enum: ['full', 'half'] },
    limit: { type: 'integer', minimum: 1, maximum: 30 },
    delay_minutes: { type: 'integer', minimum: 0, maximum: 180 },
    show_only_differences: { type: 'boolean' },
  };
  const schemaFor = (
    type: string | null,
    supportedFields: readonly NativeComponentFieldId[] | undefined,
  ) => {
    const properties = Object.fromEntries(
      Object.entries(allProperties)
        .filter(
          ([field]) =>
            field === 'id' ||
            field === 'type' ||
            !supportedFields ||
            supportedFields.includes(field as NativeComponentFieldId),
        )
        .map(([field, schema]) => {
          if (field === 'type' && type) return [field, { const: type }];
          if (field === 'variant' && type)
            return [
              field,
              {
                type: 'string',
                enum:
                  options.allowedVariantsByType?.[type] ?? componentVariants,
              },
            ];
          return [field, schema];
        }),
    );
    const supportsSort =
      !supportedFields ||
      (supportedFields.includes('sort_metric_id') &&
        supportedFields.includes('sort_direction'));
    return {
      type: 'object',
      properties,
      required: ['id', 'type'],
      ...(supportsSort
        ? {
            dependentRequired: {
              sort_metric_id: ['sort_direction'],
              sort_direction: ['sort_metric_id'],
            },
          }
        : {}),
      additionalProperties: false,
    };
  };
  if (options.supportedFieldsByType)
    return {
      oneOf: allowedTypes.map((type) =>
        schemaFor(type, options.supportedFieldsByType?.[type] ?? []),
      ),
    };
  return schemaFor(null, options.supportedFields);
}

export function compositionOperationSchemas(componentSchema: object) {
  const schema = componentSchema as {
    properties?: Record<string, unknown>;
    oneOf?: Array<{ properties?: Record<string, unknown> }>;
  };
  const patchSchemas = (schema.oneOf ?? [schema]).map((item) => {
    const { id: _id, ...patchProperties } = item.properties ?? {};
    return {
      type: 'object',
      properties: patchProperties,
      minProperties: 1,
      additionalProperties: false,
    };
  });
  const componentPatchSchema =
    patchSchemas.length === 1 ? patchSchemas[0] : { anyOf: patchSchemas };
  const componentIdSchema = {
    type: 'string',
    pattern: '^[a-z][a-z0-9_-]{0,39}$',
  };
  return [
    {
      type: 'object',
      properties: {
        operation: { const: 'set_composition' },
        components: {
          type: 'array',
          minItems: 1,
          maxItems: 16,
          items: componentSchema,
        },
      },
      required: ['operation', 'components'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        operation: { const: 'add_component' },
        component: componentSchema,
        position: {
          type: 'integer',
          minimum: 0,
          maximum: 15,
          description: 'Optional zero-based insertion index.',
        },
      },
      required: ['operation', 'component'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        operation: { const: 'remove_component' },
        component_id: componentIdSchema,
      },
      required: ['operation', 'component_id'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        operation: { const: 'move_component' },
        component_id: componentIdSchema,
        position: {
          type: 'integer',
          minimum: 0,
          maximum: 15,
          description: 'Zero-based final index in the composed page.',
        },
      },
      required: ['operation', 'component_id', 'position'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        operation: { const: 'configure_component' },
        component_id: componentIdSchema,
        component: {
          ...componentPatchSchema,
          description:
            'Settings to merge into the target component. The component ID is not repeated.',
        },
      },
      required: ['operation', 'component_id', 'component'],
      additionalProperties: false,
    },
  ];
}

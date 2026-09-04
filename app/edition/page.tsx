'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  CircleHelp,
  EyeOff,
  FileStack,
  Globe2,
  Lock,
  LockOpen,
  Menu,
  Pin,
  Redo2,
  RotateCcw,
  Search,
  Undo2,
  X,
} from 'lucide-react';
import {
  articleById,
  articles,
  canonicalEdition,
  clusterById,
  clusters,
  compareCoverage,
  editionRelaxations,
  formatPublished,
  formatReadingTime,
  selectEdition,
  selectionReason,
  topicLabels,
  type Article,
  type BackgroundMode,
  type EditionCandidate,
  type EditionConfig,
  type EditionSelection,
  type MinimumId,
  type TopicId,
} from '@/lib/edition';
import {
  registerEditionTools,
  type EditionWebMcpHandlers,
} from '@/lib/edition-webmcp';
import { AssistantPromptPanel } from '@/app/assistant-prompt-panel';
import {
  configureComponent,
  editionComponentTypes,
  editionGroupingIds,
  insertComponent,
  moveComponent,
  parseComposition,
  parseNativeComponent,
  parseNativeComponentPatch,
  removeComponent,
  serializeComposition,
  type NativeComponent,
} from '@/lib/composition';

const STORAGE_KEY = 'the-current-edition-v1';
const SITE_ROUTES = {
  washers: '/',
  journeys: '/journeys',
  edition: '/edition',
} as const;
const topicIds = Object.keys(topicLabels) as TopicId[];
const minimumIds: MinimumId[] = ['uk', 'world', 'science', 'local'];
const editionRecordIds = [
  ...clusters.map((cluster) => cluster.id),
  ...articles.map((article) => article.id),
];
const editionCompositionOptions = {
  allowedTypes: editionComponentTypes,
  allowedMetricIds: [
    'reading_seconds',
    'priority',
    'new_fact_count',
    'coverage_count',
    'publication_count',
  ],
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
};
type EditionFieldId =
  | 'budget_seconds'
  | 'minimums'
  | 'original_reporting_weight'
  | 'background_mode';
type ComparisonState = {
  clusterId: string;
  articleIds: string[] | null;
} | null;
type Snapshot = {
  edition: EditionConfig | null;
  lockedFields: EditionFieldId[];
  lockedTopics: TopicId[];
  pinnedClusters: string[];
  hiddenPublications: string[];
  comparison: ComparisonState;
  reasonClusterId: string | null;
  expandedClusters: string[];
};
type AppState = Snapshot & {
  revision: number;
  past: Snapshot[];
  future: Snapshot[];
};

const blankState: AppState = {
  edition: null,
  lockedFields: [],
  lockedTopics: [],
  pinnedClusters: [],
  hiddenPublications: [],
  comparison: null,
  reasonClusterId: null,
  expandedClusters: [],
  revision: 0,
  past: [],
  future: [],
};
const snapshotOf = (state: AppState): Snapshot => ({
  edition: state.edition,
  lockedFields: state.lockedFields,
  lockedTopics: state.lockedTopics,
  pinnedClusters: state.pinnedClusters,
  hiddenPublications: state.hiddenPublications,
  comparison: null,
  reasonClusterId: null,
  expandedClusters: [],
});
const jsonSafe = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const cloneConfig = (config: EditionConfig): EditionConfig => jsonSafe(config);
const abortIfNeeded = (signal?: AbortSignal) => signal?.throwIfAborted();
const delayPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
const toolFailure = (
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) => ({ ok: false, error: { code, message, ...extra } });

const handleDialogKey = (
  event: ReactKeyboardEvent<HTMLDialogElement>,
  close: () => void,
) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

function restoreState(raw: Partial<AppState>): AppState {
  const publications = new Set(articles.map((article) => article.publication));
  const restoreEdition = (edition: EditionConfig | null | undefined) => {
    if (!edition) return null;
    let composition = canonicalEdition.composition;
    try {
      composition = parseComposition(
        Array.isArray(edition.composition)
          ? edition.composition
          : canonicalEdition.composition,
        editionCompositionOptions,
      );
    } catch {
      composition = canonicalEdition.composition;
    }
    return { ...edition, composition };
  };
  const restore = (item: Partial<Snapshot> | undefined): Snapshot => ({
    edition: restoreEdition(item?.edition),
    lockedFields:
      item?.lockedFields?.filter((id) =>
        [
          'budget_seconds',
          'minimums',
          'original_reporting_weight',
          'background_mode',
        ].includes(id),
      ) ?? [],
    lockedTopics:
      item?.lockedTopics?.filter((id) => topicIds.includes(id)) ?? [],
    pinnedClusters:
      item?.pinnedClusters?.filter((id) => clusterById.has(id)) ?? [],
    hiddenPublications:
      item?.hiddenPublications?.filter((id) => publications.has(id)) ?? [],
    comparison:
      item?.comparison && clusterById.has(item.comparison.clusterId)
        ? item.comparison
        : null,
    reasonClusterId:
      item?.reasonClusterId && clusterById.has(item.reasonClusterId)
        ? item.reasonClusterId
        : null,
    expandedClusters:
      item?.expandedClusters?.filter((id) => clusterById.has(id)) ?? [],
  });
  return {
    ...restore(raw),
    revision: typeof raw.revision === 'number' ? raw.revision : 0,
    past: (raw.past ?? []).map((item) => restore(item)),
    future: (raw.future ?? []).map((item) => restore(item)),
  };
}

function validateConfig(config: EditionConfig) {
  try {
    parseComposition(config.composition, editionCompositionOptions);
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid page composition.';
  }
  if (
    !Number.isInteger(config.budgetSeconds) ||
    config.budgetSeconds < 300 ||
    config.budgetSeconds > 1200
  )
    return 'Reading budget must be 300–1,200 seconds.';
  if (
    config.excludedTopicIds.some((id) => !topicIds.includes(id)) ||
    new Set(config.excludedTopicIds).size !== config.excludedTopicIds.length
  )
    return 'Topic policy must use unique supported topic IDs.';
  if (
    minimumIds.some(
      (id) =>
        !Number.isInteger(config.minimums[id]) ||
        config.minimums[id] < 0 ||
        config.minimums[id] > 5,
    )
  )
    return 'Topic minimums must be whole numbers from 0 to 5.';
  if (
    !Number.isFinite(config.originalReportingWeight) ||
    config.originalReportingWeight < 0 ||
    config.originalReportingWeight > 1
  )
    return 'Original-reporting preference must be between 0 and 1.';
  if (
    !['omit', 'include_free', 'include_counted'].includes(config.backgroundMode)
  )
    return 'Choose a supported background mode.';
  return null;
}

function SiteLinks() {
  return (
    <nav className="tc-more" aria-label="More live WebMCP examples">
      <strong>More live WebMCP examples</strong>
      <a href={SITE_ROUTES.washers}>Hearth &amp; Home washers</a>
      <a href={SITE_ROUTES.journeys}>Wayline journeys</a>
    </nav>
  );
}

function CurrentHeader({ mcpAvailable }: { mcpAvailable: boolean }) {
  return (
    <>
      <header className="tc-header">
        <button type="button" aria-label="Open menu">
          <Menu />
        </button>
        <a href={SITE_ROUTES.edition} className="tc-wordmark">
          The Current
        </a>
        <nav aria-label="Reader tools">
          <a href="#latest">Latest</a>
          <a href="#edition-end">Saved</a>
          <button type="button" aria-label="Search">
            <Search />
          </button>
        </nav>
      </header>
      {mcpAvailable && (
        <div className="tc-assistant">
          <AssistantPromptPanel
            className="assistant-prompt-current"
            prompts={[
              'Give me a finite ten-minute edition. Merge repeated coverage, preserve original reporting, and put genuinely new developments first.',
              'Replace the edition with a chronological timeline of the tidal-energy story. Include only moments when a new verified fact appeared.',
              'Turn the timeline into a provenance map showing who reported each fact first, which publications repeated it, and where the evidence changed.',
            ]}
            links={[
              { href: '/', label: 'Try Hearth & Home' },
              { href: '/journeys', label: 'Try Wayline' },
            ]}
          />
        </div>
      )}
    </>
  );
}

function ArticleMeta({ article }: { article: Article }) {
  return (
    <p className="tc-article-meta">
      <span>{article.publication}</span>
      <span>{article.reporter}</span>
      <span>{formatPublished(article.publishedAt)}</span>
      <span>{formatReadingTime(article.readSeconds)}</span>
    </p>
  );
}

function StoryImage({
  clusterId,
  compact = false,
}: {
  clusterId: string;
  compact?: boolean;
}) {
  const image =
    clusterId === 'selene-ice'
      ? {
          src: '/edition/lunar-observation-control-room.png',
          alt: 'A researcher studies lunar imagery in an observation control room',
        }
      : clusterId === 'solmere-tide'
        ? {
            src: '/edition/tidal-energy-harbour.png',
            alt: 'A maintenance vessel works beside tidal turbines in a British harbour',
          }
        : null;
  if (!image) return null;
  return (
    <figure className={`tc-story-image ${compact ? 'compact' : ''}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={
          compact
            ? '(max-width: 720px) 100vw, 300px'
            : '(max-width: 960px) 100vw, 680px'
        }
      />
    </figure>
  );
}

function StandardPage() {
  const [topic, setTopic] = useState<TopicId | 'all'>('all');
  const ordered = useMemo(
    () =>
      [...articles]
        .filter(
          (article) =>
            topic === 'all' ||
            clusterById.get(article.clusterId)?.topicId === topic,
        )
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [topic],
  );
  const lead =
    topic === 'all' ? articleById.get('sel-04')! : (ordered[0] ?? articles[0]);
  const supporting =
    topic === 'all'
      ? ['sol-05', 'mar-03', 'cal-03', 'qua-03']
          .map((id) => articleById.get(id)!)
          .filter(Boolean)
      : ordered.filter((article) => article.id !== lead.id).slice(0, 4);
  return (
    <main className="tc-shell tc-standard" id="top">
      <div className="tc-date-line">
        <span>Friday 4 September 2026</span>
        <span>Fictional demonstration newsroom</span>
        <span>London · 16°C</span>
      </div>
      <nav className="tc-topic-nav" aria-label="Topics">
        <button
          type="button"
          className={topic === 'all' ? 'active' : ''}
          onClick={() => setTopic('all')}
        >
          Top stories
        </button>
        {topicIds
          .filter((id) => id !== 'celebrity')
          .map((id) => (
            <button
              type="button"
              className={topic === id ? 'active' : ''}
              key={id}
              onClick={() => setTopic(id)}
            >
              {topicLabels[id]}
            </button>
          ))}
      </nav>
      <section className="tc-lead-grid">
        <article className="tc-lead">
          <p className="tc-section-label">
            {clusterById.get(lead.clusterId)?.section}
          </p>
          <StoryImage clusterId={lead.clusterId} />
          <h1>{lead.headline}</h1>
          <p className="tc-deck">{lead.deck}</p>
          <ArticleMeta article={lead} />
        </article>
        <div className="tc-supporting">
          {supporting.map((article) => (
            <article key={article.id}>
              <p className="tc-section-label">
                {clusterById.get(article.clusterId)?.section}
              </p>
              <StoryImage clusterId={article.clusterId} compact />
              <h2>{article.headline}</h2>
              <p>{article.deck}</p>
              <ArticleMeta article={article} />
            </article>
          ))}
        </div>
      </section>
      <section className="tc-latest" id="latest">
        <div className="tc-latest-heading">
          <h2>Latest</h2>
          <span>Updated through 10:18</span>
        </div>
        {ordered.map((article, index) => (
          <article key={`${article.id}-${index}`}>
            <time>{formatPublished(article.publishedAt)}</time>
            <div>
              <p className="tc-section-label">
                {clusterById.get(article.clusterId)?.section}
              </p>
              <h3>{article.headline}</h3>
              <p>{article.deck}</p>
              <ArticleMeta article={article} />
            </div>
            <span className="tc-read-time">
              {formatReadingTime(article.readSeconds)}
            </span>
          </article>
        ))}
      </section>
      <footer className="tc-footer">
        <p>
          The Current is a fictional demonstration newsroom. Every publication,
          reporter, event and article on this page is invented.
        </p>
        <SiteLinks />
      </footer>
    </main>
  );
}

function FieldLock({
  field,
  state,
  commit,
  label,
}: {
  field: EditionFieldId;
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  label: string;
}) {
  const locked = state.lockedFields.includes(field);
  return (
    <button
      type="button"
      className="tc-lock"
      onClick={() =>
        commit((current) => ({
          ...current,
          lockedFields: locked
            ? current.lockedFields.filter((id) => id !== field)
            : [...current.lockedFields, field],
        }))
      }
      aria-label={`${locked ? 'Unlock' : 'Lock'} ${label}`}
    >
      {locked ? <Lock size={13} /> : <LockOpen size={13} />}
    </button>
  );
}

function EditionControls({
  state,
  commit,
  announce,
}: {
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  announce: (message: string) => void;
}) {
  const config = state.edition!;
  const update = (nextConfig: EditionConfig, message: string) => {
    const next = commit((current) => ({ ...current, edition: nextConfig }));
    announce(
      `${message}. ${selectEdition(next.edition!, next.pinnedClusters, next.hiddenPublications).selected.length} developments selected.`,
    );
  };
  return (
    <aside className="tc-controls" aria-labelledby="tc-controls-title">
      <div className="tc-controls-heading">
        <p className="tc-eyebrow">Edit your edition</p>
        <h2 id="tc-controls-title">Reading choices</h2>
      </div>
      <section
        className={
          state.lockedFields.includes('budget_seconds') ? 'is-locked' : ''
        }
      >
        <div className="tc-control-title">
          <h3>Time budget</h3>
          <FieldLock
            field="budget_seconds"
            state={state}
            commit={commit}
            label="time budget"
          />
        </div>
        <div className="tc-budget-presets">
          {[5, 10, 15, 20].map((minutes) => (
            <button
              type="button"
              className={config.budgetSeconds === minutes * 60 ? 'active' : ''}
              key={minutes}
              onClick={() =>
                update(
                  { ...config, budgetSeconds: minutes * 60 },
                  `${minutes}-minute budget selected`,
                )
              }
            >
              {minutes}m
            </button>
          ))}
        </div>
        <label className="tc-minute-input">
          Exact minutes
          <input
            type="number"
            min="5"
            max="20"
            step="1"
            value={config.budgetSeconds / 60}
            onChange={(event) => {
              const minutes = Number(event.target.value);
              if (Number.isInteger(minutes) && minutes >= 5 && minutes <= 20)
                update(
                  { ...config, budgetSeconds: minutes * 60 },
                  `${minutes}-minute budget selected`,
                );
            }}
          />
        </label>
      </section>
      <section>
        <div className="tc-control-title">
          <h3>Topics</h3>
          <span>Click the lock beside any policy to protect it.</span>
        </div>
        <div className="tc-topic-policies">
          {topicIds.map((id) => {
            const excluded = config.excludedTopicIds.includes(id),
              locked = state.lockedTopics.includes(id);
            return (
              <div key={id} className={locked ? 'is-locked' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() =>
                      update(
                        {
                          ...config,
                          excludedTopicIds: excluded
                            ? config.excludedTopicIds.filter(
                                (item) => item !== id,
                              )
                            : [...config.excludedTopicIds, id],
                        },
                        `${topicLabels[id]} ${excluded ? 'included' : 'excluded'}`,
                      )
                    }
                  />
                  {topicLabels[id]}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    commit((current) => ({
                      ...current,
                      lockedTopics: locked
                        ? current.lockedTopics.filter((item) => item !== id)
                        : [...current.lockedTopics, id],
                    }))
                  }
                  aria-label={`${locked ? 'Unlock' : 'Lock'} ${topicLabels[id]}`}
                >
                  {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section
        className={state.lockedFields.includes('minimums') ? 'is-locked' : ''}
      >
        <div className="tc-control-title">
          <h3>Minimum coverage</h3>
          <FieldLock
            field="minimums"
            state={state}
            commit={commit}
            label="coverage minimums"
          />
        </div>
        <div className="tc-minimums">
          {minimumIds.map((id) => (
            <label key={id}>
              <span>{topicLabels[id]}</span>
              <input
                type="number"
                min="0"
                max="5"
                value={config.minimums[id]}
                onChange={(event) =>
                  update(
                    {
                      ...config,
                      minimums: {
                        ...config.minimums,
                        [id]: Math.max(
                          0,
                          Math.min(5, Number(event.target.value)),
                        ),
                      },
                    },
                    `${topicLabels[id]} minimum updated`,
                  )
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section
        className={
          state.lockedFields.includes('original_reporting_weight')
            ? 'is-locked'
            : ''
        }
      >
        <div className="tc-control-title">
          <h3>Original reporting</h3>
          <FieldLock
            field="original_reporting_weight"
            state={state}
            commit={commit}
            label="original reporting preference"
          />
        </div>
        <div className="tc-range-label">
          <span>More breadth</span>
          <span>More original</span>
        </div>
        <input
          className="tc-range"
          type="range"
          aria-label="Original reporting preference"
          min="0"
          max="100"
          value={Math.round(config.originalReportingWeight * 100)}
          onChange={(event) =>
            update(
              {
                ...config,
                originalReportingWeight: Number(event.target.value) / 100,
              },
              'Reporting preference updated',
            )
          }
        />
        <p>
          {Math.round(config.originalReportingWeight * 100)}% preference for
          original reporting
        </p>
      </section>
      <section
        className={
          state.lockedFields.includes('background_mode') ? 'is-locked' : ''
        }
      >
        <div className="tc-control-title">
          <h3>Background explainers</h3>
          <FieldLock
            field="background_mode"
            state={state}
            commit={commit}
            label="background policy"
          />
        </div>
        <select
          aria-label="Background explainer policy"
          value={config.backgroundMode}
          onChange={(event) =>
            update(
              {
                ...config,
                backgroundMode: event.target.value as BackgroundMode,
              },
              'Background policy updated',
            )
          }
        >
          <option value="omit">Keep outside this edition</option>
          <option value="include_free">Show without using budget</option>
          <option value="include_counted">Count toward reading time</option>
        </select>
      </section>
    </aside>
  );
}

function StoryCard({
  candidate,
  index,
  state,
  selection,
  commit,
  openReason,
  openComparison,
}: {
  candidate: EditionCandidate;
  index: number;
  state: AppState;
  selection: EditionSelection;
  commit: (fn: (state: AppState) => AppState) => AppState;
  openReason: () => void;
  openComparison: () => void;
}) {
  const pinned = state.pinnedClusters.includes(candidate.cluster.id);
  const reason = selectionReason(candidate, selection, state.edition!);
  const visibleRelated = candidate.related.filter(
    (article) => !state.hiddenPublications.includes(article.publication),
  );
  const collapsedCount = candidate.related.filter(
    (article) => article.role !== 'background',
  ).length;
  const expanded = state.expandedClusters.includes(candidate.cluster.id);
  return (
    <article className="tc-edition-story" id={`story-${candidate.cluster.id}`}>
      <div className="tc-story-number">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="tc-story-content">
        <div className="tc-story-topline">
          <span>{candidate.cluster.section}</span>
          <span>{formatReadingTime(candidate.seconds)}</span>
          {reason.matched_minimum_ids.map((id) => (
            <strong key={id}>Preserves {id}</strong>
          ))}
        </div>
        <h2>{candidate.representative.headline}</h2>
        <p className="tc-deck">{candidate.representative.deck}</p>
        <section className="tc-new-facts">
          <p className="tc-eyebrow">What is new</p>
          <ul>
            {candidate.whatNewFacts.map((fact) => (
              <li key={fact.id}>{fact.text}</li>
            ))}
          </ul>
        </section>
        <div className="tc-source-line">
          <span className="tc-original">
            {candidate.representative.originalReporting
              ? 'Original reporting'
              : 'Verified follow-up'}
          </span>
          <span>{candidate.representative.publication}</span>
          <span>{candidate.representative.reporter}</span>
          <span>{formatPublished(candidate.representative.publishedAt)}</span>
        </div>
        <div className="tc-collapse-note">
          <FileStack size={15} />
          <span>
            {collapsedCount} substantially similar{' '}
            {collapsedCount === 1 ? 'article' : 'articles'} collapsed.
          </span>
          <button
            type="button"
            onClick={() =>
              commit((current) => ({
                ...current,
                expandedClusters: expanded
                  ? current.expandedClusters.filter(
                      (id) => id !== candidate.cluster.id,
                    )
                  : [...current.expandedClusters, candidate.cluster.id],
              }))
            }
          >
            {expanded ? 'Hide' : 'View'} related coverage{' '}
            <ChevronDown size={14} />
          </button>
        </div>
        {expanded && (
          <div className="tc-related">
            {visibleRelated.map((article) => (
              <article key={article.id}>
                <div>
                  <span>
                    {article.publication} · {article.role.replace('_', ' ')}
                  </span>
                  <strong>{article.headline}</strong>
                  <small>
                    {formatPublished(article.publishedAt)} ·{' '}
                    {formatReadingTime(article.readSeconds)}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    commit((current) => ({
                      ...current,
                      hiddenPublications: [
                        ...new Set([
                          ...current.hiddenPublications,
                          article.publication,
                        ]),
                      ],
                    }))
                  }
                >
                  <EyeOff size={13} />
                  Hide source
                </button>
              </article>
            ))}
            {!visibleRelated.length && (
              <p>Every related source is currently hidden.</p>
            )}
          </div>
        )}
        <div className="tc-story-actions">
          <button
            type="button"
            className={pinned ? 'active' : ''}
            onClick={() =>
              commit((current) => ({
                ...current,
                pinnedClusters: pinned
                  ? current.pinnedClusters.filter(
                      (id) => id !== candidate.cluster.id,
                    )
                  : [...current.pinnedClusters, candidate.cluster.id],
              }))
            }
          >
            <Pin size={14} />
            {pinned ? 'Pinned' : 'Pin story'}
          </button>
          <button type="button" onClick={openComparison}>
            <FileStack size={14} />
            Compare coverage
          </button>
          <button type="button" onClick={openReason}>
            <CircleHelp size={14} />
            Why this made it
          </button>
        </div>
      </div>
    </article>
  );
}

function ReasonDialog({
  state,
  selection,
  close,
}: {
  state: AppState;
  selection: EditionSelection;
  close: () => void;
}) {
  if (!state.reasonClusterId || !state.edition) return null;
  const candidate = selection.selected.find(
    (item) => item.cluster.id === state.reasonClusterId,
  );
  if (!candidate) return null;
  const reason = selectionReason(candidate, selection, state.edition);
  return (
    <div className="tc-dialog-backdrop">
      <dialog
        open
        aria-modal="true"
        className="tc-reason-dialog"
        aria-labelledby="tc-reason-title"
        onKeyDown={(event) => handleDialogKey(event, close)}
      >
        <button
          type="button"
          autoFocus
          className="tc-dialog-close"
          onClick={close}
          aria-label="Close selection reason"
        >
          <X />
        </button>
        <p className="tc-eyebrow">Transparent selection</p>
        <h2 id="tc-reason-title">Why this made your edition</h2>
        <h3>{candidate.representative.headline}</h3>
        <div className="tc-reason-total">
          <span>Time used after this story</span>
          <strong>{formatReadingTime(reason.used_after_seconds)}</strong>
          <small>of {formatReadingTime(reason.budget_seconds)}</small>
        </div>
        <dl>
          <div>
            <dt>Reading time</dt>
            <dd>{formatReadingTime(reason.story_seconds)}</dd>
          </div>
          <div>
            <dt>Novel facts contributed</dt>
            <dd>{reason.novel_facts.length}</dd>
          </div>
          <div>
            <dt>Original-reporting status</dt>
            <dd>
              {reason.original_reporting
                ? 'Original report'
                : 'Verified follow-up'}
            </dd>
          </div>
          <div>
            <dt>Duplicate articles displaced</dt>
            <dd>{reason.displaced_articles.length}</dd>
          </div>
          <div>
            <dt>Required topics preserved</dt>
            <dd>
              {reason.matched_minimum_ids.join(', ') || 'Not quota-dependent'}
            </dd>
          </div>
        </dl>
        <section>
          <h4>Deterministic reason</h4>
          <p>{reason.deterministic_reason}</p>
          <code>{reason.arithmetic}</code>
        </section>
        <section>
          <h4>Primary original report</h4>
          <p>
            {reason.primary_original_report
              ? `${reason.primary_original_report.publication} · ${reason.primary_original_report.reporter}`
              : 'No original report in the visible dataset'}
          </p>
        </section>
      </dialog>
    </div>
  );
}

function CoverageDialog({
  state,
  close,
}: {
  state: AppState;
  close: () => void;
}) {
  if (!state.comparison) return null;
  const visibleArticleIds = articles
    .filter(
      (article) =>
        article.clusterId === state.comparison!.clusterId &&
        article.role !== 'background' &&
        !state.hiddenPublications.includes(article.publication),
    )
    .map((article) => article.id);
  const comparison = compareCoverage(
    state.comparison.clusterId,
    state.comparison.articleIds ?? visibleArticleIds,
  );
  if (!comparison) return null;
  return (
    <div className="tc-dialog-backdrop">
      <dialog
        open
        aria-modal="true"
        className="tc-coverage-dialog"
        aria-labelledby="tc-coverage-title"
        onKeyDown={(event) => handleDialogKey(event, close)}
      >
        <button
          type="button"
          autoFocus
          className="tc-dialog-close"
          onClick={close}
          aria-label="Close coverage comparison"
        >
          <X />
        </button>
        <p className="tc-eyebrow">Provenance inspection</p>
        <h2 id="tc-coverage-title">
          How coverage of {comparison.cluster.label} changed
        </h2>
        <section className="tc-shared-facts">
          <h3>Facts shared by every report</h3>
          <ul>
            {comparison.sharedFacts.map((fact) => (
              <li key={fact.id}>{fact.text}</li>
            ))}
          </ul>
        </section>
        <div className="tc-coverage-grid">
          {comparison.articles.map((article) => (
            <article key={article.id}>
              <div className="tc-order">{article.publicationOrder}</div>
              <p>
                {article.publication} · {formatPublished(article.publishedAt)}
              </p>
              <h3>{article.headline}</h3>
              <div className="tc-provenance-badges">
                <span>
                  {article.originalReporting
                    ? 'Original reporting'
                    : article.role.replace('_', ' ')}
                </span>
                <span>{formatReadingTime(article.readSeconds)}</span>
              </div>
              <h4>Genuinely changed here</h4>
              {article.genuinelyChanged.length ? (
                <ul>
                  {article.genuinelyChanged.map((fact) => (
                    <li key={fact.id}>{fact.text}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No new verified facts; this report repeats existing coverage.
                </p>
              )}
              <h4>Facts unique in this comparison</h4>
              {article.uniqueFacts.length ? (
                <ul>
                  {article.uniqueFacts.map((fact) => (
                    <li key={fact.id}>{fact.text}</li>
                  ))}
                </ul>
              ) : (
                <p>None.</p>
              )}
            </article>
          ))}
        </div>
      </dialog>
    </div>
  );
}

function DecisionPage({
  state,
  commit,
  replaceTransient,
  undo,
  redo,
  announce,
}: {
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  replaceTransient: (fn: (state: AppState) => AppState) => AppState;
  undo: () => void;
  redo: () => void;
  announce: (message: string) => void;
}) {
  const config = state.edition!;
  const selection = useMemo(
    () => selectEdition(config, state.pinnedClusters, state.hiddenPublications),
    [config, state.hiddenPublications, state.pinnedClusters],
  );
  const relaxations = editionRelaxations(
    config,
    state.pinnedClusters,
    state.hiddenPublications,
  );
  const progress = Math.min(
    100,
    (selection.usedSeconds / config.budgetSeconds) * 100,
  );
  return (
    <main className="tc-shell tc-decision" id="top">
      <section className="tc-edition-hero">
        <div>
          <p className="tc-eyebrow">Your finite edition</p>
          <h1 tabIndex={-1} id="tc-edition-heading">
            {selection.feasible
              ? `Your ${formatReadingTime(selection.usedSeconds)} edition.`
              : 'Your edition cannot fit these choices yet.'}
          </h1>
          <p>
            {selection.feasible ? (
              <>
                <strong>
                  {articles.length} articles became {selection.selected.length}{' '}
                  developments worth {formatReadingTime(selection.usedSeconds)}.
                </strong>{' '}
                Repeated coverage is collapsed; original reporting and genuinely
                new facts stay visible.
              </>
            ) : (
              <>
                Your requirements are preserved. Choose one exact relaxation
                below.
              </>
            )}
          </p>
        </div>
        <div className="tc-history">
          <button type="button" onClick={undo} disabled={!state.past.length}>
            <Undo2 size={14} />
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!state.future.length}>
            Redo
            <Redo2 size={14} />
          </button>
        </div>
      </section>
      <section
        className="tc-budget-bar"
        aria-label={`${formatReadingTime(selection.usedSeconds)} of ${formatReadingTime(config.budgetSeconds)} reading budget used`}
      >
        <div>
          <span>Reading budget</span>
          <strong>
            {formatReadingTime(selection.usedSeconds)} /{' '}
            {formatReadingTime(config.budgetSeconds)}
          </strong>
        </div>
        <i>
          <b style={{ width: `${progress}%` }} />
        </i>
        <p>
          {selection.remainingSeconds
            ? `${formatReadingTime(selection.remainingSeconds)} left`
            : 'Budget fully used'}
        </p>
      </section>
      <div className="tc-decision-layout">
        <EditionControls state={state} commit={commit} announce={announce} />
        <section
          className="tc-edition-stream"
          aria-labelledby="tc-stream-title"
        >
          <div className="tc-stream-heading">
            <div>
              <p className="tc-eyebrow">Genuinely new first</p>
              <h2 id="tc-stream-title">
                {selection.selected.length} developments, not {articles.length}{' '}
                headlines
              </h2>
            </div>
            {minimumIds.some((id) => config.minimums[id] > 0) ? (
              <span>
                <Globe2 size={15} />
                {minimumIds
                  .filter((id) => config.minimums[id] > 0)
                  .map((id) => topicLabels[id])
                  .join(' · ')}{' '}
                preserved
              </span>
            ) : null}
          </div>
          {selection.feasible ? (
            <>
              {selection.selected.map((candidate, index) => (
                <StoryCard
                  key={candidate.cluster.id}
                  candidate={candidate}
                  index={index}
                  state={state}
                  selection={selection}
                  commit={commit}
                  openReason={() =>
                    replaceTransient((current) => ({
                      ...current,
                      reasonClusterId: candidate.cluster.id,
                    }))
                  }
                  openComparison={() =>
                    commit((current) => ({
                      ...current,
                      comparison: {
                        clusterId: candidate.cluster.id,
                        articleIds: null,
                      },
                    }))
                  }
                />
              ))}
              <div className="tc-edition-end" id="edition-end">
                <Check />
                <p>
                  <strong>End of your edition</strong>
                  <span>
                    {formatReadingTime(selection.remainingSeconds)} unused · no
                    infinite feed
                  </span>
                </p>
              </div>
            </>
          ) : (
            <section className="tc-zero">
              <p className="tc-eyebrow">Requirements preserved</p>
              <h2>This edition cannot fit yet</h2>
              <p>
                No topic minimum, pin, source choice, or background policy was
                silently dropped.
              </p>
              <div>
                {relaxations.map((relaxation) => (
                  <button
                    type="button"
                    key={relaxation.id}
                    onClick={() =>
                      commit((current) => ({
                        ...current,
                        edition: { ...current.edition!, ...relaxation.patch },
                        hiddenPublications: relaxation.restorePublications
                          ? []
                          : current.hiddenPublications,
                        pinnedClusters: relaxation.unpinAll
                          ? []
                          : current.pinnedClusters,
                      }))
                    }
                  >
                    {relaxation.label}
                    <span>Apply only this change</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
      {state.hiddenPublications.length > 0 && (
        <div className="tc-hidden">
          <EyeOff size={15} />
          <span>
            {state.hiddenPublications.length} hidden{' '}
            {state.hiddenPublications.length === 1
              ? 'publication'
              : 'publications'}
          </span>
          <button
            type="button"
            onClick={() =>
              commit((current) => ({ ...current, hiddenPublications: [] }))
            }
          >
            Restore all
          </button>
        </div>
      )}
      <footer className="tc-footer">
        <p>
          The Current is a fictional demonstration newsroom. Every publication,
          reporter, event and article on this page is invented.
        </p>
        <button
          type="button"
          onClick={() =>
            commit((current) => ({
              ...current,
              edition: null,
              comparison: null,
              reasonClusterId: null,
            }))
          }
        >
          <RotateCcw size={14} />
          Return to the ordinary homepage
        </button>
        <SiteLinks />
      </footer>
      <ReasonDialog
        state={state}
        selection={selection}
        close={() =>
          replaceTransient((current) => ({ ...current, reasonClusterId: null }))
        }
      />
      <CoverageDialog
        state={state}
        close={() => commit((current) => ({ ...current, comparison: null }))}
      />
    </main>
  );
}

function clusterForComponent(component: NativeComponent) {
  for (const id of component.recordIds ?? []) {
    const cluster = clusterById.get(id);
    if (cluster) return cluster;
    const article = articleById.get(id);
    if (article) return clusterById.get(article.clusterId) ?? null;
  }
  return clusterById.get('solmere-tide') ?? clusters[0] ?? null;
}

function CurrentTimeline({ component }: { component: NativeComponent }) {
  const cluster = clusterForComponent(component);
  if (!cluster) return null;
  const timeline = articles
    .filter((article) => article.clusterId === cluster.id)
    .filter((article) =>
      component.variant === 'new_only'
        ? article.introducedFactIds.length > 0 && article.role !== 'background'
        : component.type === 'background_material'
          ? article.role === 'background'
          : true,
    )
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const facts = new Map(cluster.facts.map((fact) => [fact.id, fact.text]));
  return (
    <div className="tc-native-timeline">
      {timeline.map((article) => (
        <article key={article.id}>
          <time>{formatPublished(article.publishedAt)}</time>
          <span className={article.originalReporting ? 'is-original' : ''}>
            {article.originalReporting
              ? 'Original'
              : article.role.replaceAll('_', ' ')}
          </span>
          <h3>{article.headline}</h3>
          <p>
            {article.publication} · {article.reporter}
          </p>
          {article.introducedFactIds.length > 0 && (
            <ul>
              {article.introducedFactIds.map((id) => (
                <li key={id}>{facts.get(id)}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

function ProvenanceMap({ component }: { component: NativeComponent }) {
  const cluster = clusterForComponent(component);
  if (!cluster) return null;
  const coverage = articles
    .filter((article) => article.clusterId === cluster.id)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return (
    <div className="tc-provenance-map">
      {cluster.facts.map((fact) => {
        const carriers = coverage.filter((article) =>
          article.factIds.includes(fact.id),
        );
        const first = carriers[0];
        return (
          <article key={fact.id}>
            <span>{fact.id}</span>
            <h3>{fact.text}</h3>
            <div className="tc-provenance-first">
              <strong>First in this dataset</strong>
              <p>
                {first
                  ? `${first.publication} · ${first.reporter} · ${formatPublished(first.publishedAt)}`
                  : 'No visible source'}
              </p>
            </div>
            <div>
              <strong>Repeated by</strong>
              <p>
                {carriers
                  .slice(1)
                  .map((article) => article.publication)
                  .join(' · ') || 'No later repetition'}
              </p>
            </div>
            <small>
              {carriers.some((article) =>
                article.introducedFactIds.includes(fact.id),
              )
                ? 'Evidence enters the record here.'
                : 'Background fact retained from earlier reporting.'}
            </small>
          </article>
        );
      })}
    </div>
  );
}

function ComposedEditionPage({
  state,
  commit,
  replaceTransient,
  undo,
  redo,
  announce,
}: {
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  replaceTransient: (fn: (state: AppState) => AppState) => AppState;
  undo: () => void;
  redo: () => void;
  announce: (message: string) => void;
}) {
  const config = state.edition!;
  const selection = useMemo(
    () => selectEdition(config, state.pinnedClusters, state.hiddenPublications),
    [config, state.hiddenPublications, state.pinnedClusters],
  );
  const relaxations = editionRelaxations(
    config,
    state.pinnedClusters,
    state.hiddenPublications,
  );
  const openReason = (clusterId: string) =>
    replaceTransient((current) => ({
      ...current,
      reasonClusterId: clusterId,
      comparison: null,
    }));
  const openComparison = (clusterId: string) =>
    replaceTransient((current) => ({
      ...current,
      comparison: { clusterId, articleIds: null },
      reasonClusterId: null,
    }));
  const componentHeading = (component: NativeComponent, fallback: string) =>
    component.heading ?? fallback;
  const renderComponent = (component: NativeComponent) => {
    const headingId = `tc-component-${component.id}`;
    const focus = clusterForComponent(component);
    const shell = (content: React.ReactNode, extra = '') => (
      <section
        key={component.id}
        className={`tc-composed-block tc-${component.type} ${component.width === 'half' ? 'tc-half' : ''} ${extra}`}
        data-component-id={component.id}
        data-component-type={component.type}
        aria-labelledby={headingId}
      >
        {content}
      </section>
    );
    if (component.type === 'decision_summary')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">A finite, source-preserving edition</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  selection.feasible
                    ? `${articles.length} headlines became ${selection.selected.length} developments`
                    : 'These choices do not fit yet',
                )}
              </h2>
            </div>
            <strong>
              {selection.feasible
                ? formatReadingTime(selection.usedSeconds)
                : '—'}
            </strong>
          </div>
          <p>
            {selection.feasible
              ? `Repeated coverage is merged. ${selection.selected.length} distinct developments use ${formatReadingTime(selection.usedSeconds)} of the ${formatReadingTime(config.budgetSeconds)} budget.`
              : 'No topic, pin, hidden source or minimum was silently discarded.'}
          </p>
          <div className="tc-state-pills">
            <span>{state.pinnedClusters.length} pinned</span>
            <span>{state.hiddenPublications.length} hidden sources</span>
            <span>
              {state.lockedFields.length + state.lockedTopics.length} locks
            </span>
          </div>
        </>,
      );
    if (component.type === 'assumptions')
      return shell(
        <>
          <h2 id={headingId} className="sr-only">
            {componentHeading(component, 'Edition controls')}
          </h2>
          <EditionControls state={state} commit={commit} announce={announce} />
        </>,
      );
    if (component.type === 'metric_strip')
      return shell(
        <>
          <h2 id={headingId}>
            {componentHeading(component, 'Edition at a glance')}
          </h2>
          <div className="tc-metric-strip">
            <div>
              <strong>{articles.length}</strong>
              <span>source articles</span>
            </div>
            <div>
              <strong>{selection.selected.length}</strong>
              <span>developments</span>
            </div>
            <div>
              <strong>{formatReadingTime(selection.usedSeconds)}</strong>
              <span>reading time</span>
            </div>
            <div>
              <strong>
                {selection.selected.reduce(
                  (sum, item) => sum + item.whatNewFacts.length,
                  0,
                )}
              </strong>
              <span>new verified facts</span>
            </div>
          </div>
        </>,
      );
    if (
      component.type === 'finite_edition' ||
      component.type === 'reading_queue'
    )
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">
                {component.type === 'reading_queue'
                  ? 'Read now'
                  : 'Genuinely new first'}
              </p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  `${selection.selected.length} developments, not ${articles.length} headlines`,
                )}
              </h2>
            </div>
            <span>{formatReadingTime(selection.remainingSeconds)} left</span>
          </div>
          {selection.feasible ? (
            <div className="tc-composed-stories">
              {selection.selected
                .slice(0, component.limit ?? selection.selected.length)
                .map((candidate, index) => (
                  <StoryCard
                    key={candidate.cluster.id}
                    candidate={candidate}
                    index={index}
                    state={state}
                    selection={selection}
                    commit={commit}
                    openReason={() => openReason(candidate.cluster.id)}
                    openComparison={() => openComparison(candidate.cluster.id)}
                  />
                ))}
              <div className="tc-edition-end">
                <Check />
                <p>
                  <strong>End of your edition</strong>
                  <span>
                    {formatReadingTime(selection.remainingSeconds)} unused · no
                    infinite feed
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p>
              This edition has no results until one exact relaxation is applied.
            </p>
          )}
        </>,
      );
    if (
      component.type === 'chronological_timeline' ||
      component.type === 'background_material'
    )
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Verified chronology</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  focus
                    ? `${focus.label}: what changed, in order`
                    : 'Story timeline',
                )}
              </h2>
            </div>
            <span>
              {component.variant === 'new_only'
                ? 'New facts only'
                : 'All visible coverage'}
            </span>
          </div>
          <CurrentTimeline component={component} />
        </>,
      );
    if (component.type === 'provenance_map')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Fact by fact</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  focus ? `${focus.label}: provenance map` : 'Provenance map',
                )}
              </h2>
            </div>
            <span>First report → repeats</span>
          </div>
          <ProvenanceMap component={component} />
        </>,
      );
    if (component.type === 'repeated_coverage') {
      const coverage = focus
        ? articles
            .filter(
              (article) =>
                article.clusterId === focus.id && article.role !== 'background',
            )
            .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
        : [];
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Same story, different roles</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  focus ? `Coverage of ${focus.label}` : 'Repeated coverage',
                )}
              </h2>
            </div>
          </div>
          <div className="tc-coverage-board">
            {coverage.map((article) => (
              <article key={article.id}>
                <span>{article.role.replaceAll('_', ' ')}</span>
                <h3>{article.publication}</h3>
                <p>{article.headline}</p>
                <strong>
                  {article.introducedFactIds.length} genuinely new{' '}
                  {article.introducedFactIds.length === 1 ? 'fact' : 'facts'}
                </strong>
              </article>
            ))}
          </div>
        </>,
      );
    }
    if (component.type === 'disagreement_board')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Evidence check</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  'No verified contradictions in this demonstration dataset',
                )}
              </h2>
            </div>
          </div>
          <p>
            The source record contains additions and follow-ups rather than
            conflicting verified claims. The map below shows where evidence
            changed.
          </p>
          <CurrentTimeline
            component={{
              ...component,
              type: 'chronological_timeline',
              variant: 'new_only',
            }}
          />
        </>,
      );
    if (component.type === 'topic_dashboard')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Coverage mix</p>
              <h2 id={headingId}>
                {componentHeading(component, 'Topics in the source record')}
              </h2>
            </div>
          </div>
          <div className="tc-topic-dashboard">
            {topicIds.map((id) => {
              const sourceCount = articles.filter(
                (article) => clusterById.get(article.clusterId)?.topicId === id,
              ).length;
              const selectedCount = selection.selected.filter(
                (item) => item.cluster.topicId === id,
              ).length;
              return (
                <article key={id}>
                  <strong>{topicLabels[id]}</strong>
                  <span>{sourceCount} articles</span>
                  <b>{selectedCount} selected</b>
                </article>
              );
            })}
          </div>
        </>,
      );
    if (component.type === 'comparison')
      return shell(
        <>
          {state.comparison ? (
            <>
              <h2 id={headingId} className="sr-only">
                {componentHeading(component, 'Coverage comparison')}
              </h2>
              <CoverageDialog
                state={state}
                close={() =>
                  replaceTransient((current) => ({
                    ...current,
                    comparison: null,
                  }))
                }
              />
            </>
          ) : (
            <div className="tc-comparison-empty">
              <p className="tc-eyebrow">Side by side</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  'Choose a development to compare its coverage',
                )}
              </h2>
              <div>
                {selection.selected.slice(0, 3).map((candidate) => (
                  <button
                    key={candidate.cluster.id}
                    onClick={() => openComparison(candidate.cluster.id)}
                  >
                    {candidate.cluster.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>,
      );
    if (component.type === 'selection_explanation')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Deterministic selection</p>
              <h2 id={headingId}>
                {componentHeading(
                  component,
                  'Why each development made the edition',
                )}
              </h2>
            </div>
          </div>
          <div className="tc-reason-list">
            {selection.selected.map((candidate) => {
              const reason = selectionReason(candidate, selection, config);
              return (
                <button
                  key={candidate.cluster.id}
                  onClick={() => openReason(candidate.cluster.id)}
                >
                  <span>{candidate.cluster.label}</span>
                  <strong>{reason.deterministic_reason}</strong>
                  <code>{reason.arithmetic}</code>
                </button>
              );
            })}
          </div>
        </>,
      );
    if (component.type === 'checklist')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Reader requirements</p>
              <h2 id={headingId}>
                {componentHeading(component, 'What this edition preserves')}
              </h2>
            </div>
          </div>
          <div className="tc-checklist">
            <div>
              <Check />
              Within {formatReadingTime(config.budgetSeconds)}
            </div>
            {minimumIds
              .filter((id) => config.minimums[id] > 0)
              .map((id) => (
                <div key={id}>
                  <Check />
                  At least {config.minimums[id]} {topicLabels[id]}
                </div>
              ))}
            <div>
              <Check />
              {Math.round(config.originalReportingWeight * 100)}%
              original-reporting preference
            </div>
          </div>
        </>,
      );
    if (component.type === 'relaxations')
      return shell(
        <>
          <div className="tc-composed-heading">
            <div>
              <p className="tc-eyebrow">Requirements preserved</p>
              <h2 id={headingId}>
                {componentHeading(component, 'Exact recovery choices')}
              </h2>
            </div>
          </div>
          <div className="tc-relaxations">
            {relaxations.length ? (
              relaxations.map((relaxation) => (
                <button
                  key={relaxation.id}
                  onClick={() =>
                    commit((current) => ({
                      ...current,
                      edition: { ...current.edition!, ...relaxation.patch },
                      hiddenPublications: relaxation.restorePublications
                        ? []
                        : current.hiddenPublications,
                      pinnedClusters: relaxation.unpinAll
                        ? []
                        : current.pinnedClusters,
                    }))
                  }
                >
                  {relaxation.label}
                  <span>Apply this verified feasible change</span>
                </button>
              ))
            ) : (
              <p>No relaxation is needed.</p>
            )}
          </div>
        </>,
      );
    return null;
  };
  return (
    <main className="tc-shell tc-decision tc-composed-page" id="top">
      <section className="tc-edition-hero">
        <div>
          <p className="tc-eyebrow">Your finite edition</p>
          <h1 tabIndex={-1} id="tc-edition-heading">
            {selection.feasible
              ? `Your ${formatReadingTime(selection.usedSeconds)} edition.`
              : 'Your edition cannot fit these choices yet.'}
          </h1>
          <p>
            {selection.feasible
              ? `${articles.length} articles became ${selection.selected.length} developments. The Current keeps the facts, sources and calculations authoritative.`
              : 'Your requirements remain intact. A verified recovery choice is available below.'}
          </p>
        </div>
        <div className="tc-history">
          <button
            type="button"
            onClick={() =>
              commit((current) => ({
                ...current,
                edition: null,
                comparison: null,
                reasonClusterId: null,
              }))
            }
          >
            <RotateCcw size={14} />
            Start over
          </button>
          <button type="button" onClick={undo} disabled={!state.past.length}>
            <Undo2 size={14} />
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!state.future.length}>
            Redo
            <Redo2 size={14} />
          </button>
        </div>
      </section>
      <div className="tc-composition-grid">
        {config.composition.map(renderComponent)}
      </div>
      {state.hiddenPublications.length > 0 && (
        <div className="tc-hidden">
          <EyeOff size={15} />
          <span>
            {state.hiddenPublications.length} hidden{' '}
            {state.hiddenPublications.length === 1
              ? 'publication'
              : 'publications'}
          </span>
          <button
            onClick={() =>
              commit((current) => ({ ...current, hiddenPublications: [] }))
            }
          >
            Restore all
          </button>
        </div>
      )}
      <footer className="tc-footer">
        <p>
          The Current is a fictional demonstration newsroom. Every publication,
          reporter, event and article is invented.
        </p>
        <SiteLinks />
      </footer>
      <ReasonDialog
        state={state}
        selection={selection}
        close={() =>
          replaceTransient((current) => ({ ...current, reasonClusterId: null }))
        }
      />
      {state.comparison &&
        !config.composition.some(
          (component) => component.type === 'comparison',
        ) && (
          <CoverageDialog
            state={state}
            close={() =>
              replaceTransient((current) => ({
                ...current,
                comparison: null,
              }))
            }
          />
        )}
    </main>
  );
}

export default function EditionPage() {
  const [state, setState] = useState<AppState>(blankState);
  const [hydrated, setHydrated] = useState(false);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [building, setBuilding] = useState<{
    phase: 'working' | 'result';
    count?: number;
    seconds?: number;
  } | null>(null);
  const [recomposing, setRecomposing] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const stateRef = useRef(state);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const url = new URL(location.href);
        const fresh = url.searchParams.get('fresh') === '1';
        if (fresh) {
          localStorage.removeItem(STORAGE_KEY);
          url.searchParams.delete('fresh');
          history.replaceState(
            history.state,
            '',
            `${url.pathname}${url.search}${url.hash}`,
          );
          stateRef.current = blankState;
          setState(blankState);
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (!stored) throw new Error('No saved edition');
          const restored = restoreState(
            JSON.parse(stored) as Partial<AppState>,
          );
          stateRef.current = restored;
          setState(restored);
        }
      } catch {
        stateRef.current = blankState;
        setState(blankState);
      }
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const commit = useCallback((fn: (state: AppState) => AppState) => {
    const current = stateRef.current,
      proposed = fn(current);
    const next = {
      ...proposed,
      revision: current.revision + 1,
      past: [...current.past, snapshotOf(current)].slice(-20),
      future: [],
    };
    stateRef.current = next;
    setState(next);
    return next;
  }, []);
  const replaceTransient = useCallback((fn: (state: AppState) => AppState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);
  const undo = useCallback(() => {
    const current = stateRef.current,
      previous = current.past.at(-1);
    if (!previous) return;
    const next: AppState = {
      ...previous,
      revision: current.revision + 1,
      past: current.past.slice(0, -1),
      future: [snapshotOf(current), ...current.future].slice(0, 20),
    };
    stateRef.current = next;
    setState(next);
  }, []);
  const redo = useCallback(() => {
    const current = stateRef.current,
      following = current.future[0];
    if (!following) return;
    const next: AppState = {
      ...following,
      revision: current.revision + 1,
      past: [...current.past, snapshotOf(current)].slice(-20),
      future: current.future.slice(1),
    };
    stateRef.current = next;
    setState(next);
  }, []);

  const handlers = useMemo<EditionWebMcpHandlers>(() => {
    const compactSelection = (current: AppState) => {
      if (!current.edition) return null;
      const selected = selectEdition(
        current.edition,
        current.pinnedClusters,
        current.hiddenPublications,
      );
      return {
        feasible: selected.feasible,
        selected_cluster_ids: selected.selected.map(
          (candidate) => candidate.cluster.id,
        ),
        used_seconds: selected.usedSeconds,
        remaining_seconds: selected.remainingSeconds,
        requirement_coverage: selected.requirementCoverage,
        relaxations: editionRelaxations(
          current.edition,
          current.pinnedClusters,
          current.hiddenPublications,
        ),
      };
    };
    const readPage = async (
      _input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      abortIfNeeded(signal);
      const current = stateRef.current;
      return jsonSafe({
        ok: true,
        page: 'the_current',
        fictional_demo_newsroom: true,
        dataset_timestamp: '2026-09-04T10:18:00+01:00',
        article_count: articles.length,
        story_cluster_count: clusters.length,
        supported_topics: topicIds.map((id) => ({
          id,
          label: topicLabels[id],
        })),
        supported_minimum_ids: minimumIds,
        supported_budget_seconds: {
          minimum: 300,
          maximum: 1200,
          common_values: [300, 600, 900, 1200],
        },
        supported_background_modes: ['omit', 'include_free', 'include_counted'],
        native_component_types: editionComponentTypes,
        native_component_settings: {
          ordered: true,
          supported_fields: [
            'heading',
            'variant',
            'metric_ids',
            'record_ids',
            'assumption_ids',
            'group_by',
            'sort_metric_id',
            'sort_direction',
            'emphasized_record_ids',
            'emphasized_metric_ids',
            'width',
            'limit',
            'show_only_differences',
          ],
          supported_grouping_ids: editionGroupingIds,
          record_ids_may_reference: ['cluster_id', 'article_id'],
        },
        supported_composition_operations: [
          'set_composition',
          'add_component',
          'remove_component',
          'move_component',
          'configure_component',
        ],
        supported_human_state_operations: [
          'pin_story',
          'unpin_story',
          'hide_source',
          'restore_source',
          'lock_topic',
          'unlock_topic',
          'lock_field',
          'unlock_field',
        ],
        current_revision: current.revision,
        edition: current.edition,
        current_composition: current.edition
          ? serializeComposition(current.edition.composition)
          : [],
        selection: compactSelection(current),
        locked_field_ids: current.lockedFields,
        locked_topic_ids: current.lockedTopics,
        pinned_cluster_ids: current.pinnedClusters,
        hidden_publications: current.hiddenPublications,
        comparison: current.comparison,
        open_selection_reason_cluster_id: current.reasonClusterId,
        human_state: {
          owner: 'reader',
          locked_field_ids: current.lockedFields,
          locked_topic_ids: current.lockedTopics,
          pinned_cluster_ids: current.pinnedClusters,
          hidden_publications: current.hiddenPublications,
        },
        clusters: clusters.map((cluster) => ({
          cluster_id: cluster.id,
          label: cluster.label,
          topic_id: cluster.topicId,
          scope_id: cluster.scopeId,
          verified_facts: cluster.facts,
          primary_original_article_id: cluster.primaryOriginalArticleId,
          articles: articles
            .filter((article) => article.clusterId === cluster.id)
            .map((article) => ({
              article_id: article.id,
              headline: article.headline,
              deck: article.deck,
              publication: article.publication,
              reporter: article.reporter,
              published_at: article.publishedAt,
              reading_seconds: article.readSeconds,
              role: article.role,
              original_reporting: article.originalReporting,
              fact_ids: article.factIds,
              newly_introduced_fact_ids: article.introducedFactIds,
              parent_article_ids: article.parentArticleIds,
            })),
        })),
      });
    };
    const parseConfig = (
      input: Record<string, unknown>,
    ): EditionConfig | null => {
      const rawMinimums = input.minimums;
      if (
        !rawMinimums ||
        typeof rawMinimums !== 'object' ||
        Array.isArray(rawMinimums) ||
        !Array.isArray(input.excluded_topic_ids)
      )
        return null;
      const minima = rawMinimums as Record<string, unknown>;
      let composition: NativeComponent[];
      try {
        composition = parseComposition(
          input.components,
          editionCompositionOptions,
        );
      } catch {
        return null;
      }
      return {
        budgetSeconds: Number(input.budget_seconds),
        excludedTopicIds: input.excluded_topic_ids as TopicId[],
        minimums: {
          uk: Number(minima.uk),
          world: Number(minima.world),
          science: Number(minima.science),
          local: Number(minima.local),
        },
        originalReportingWeight: Number(input.original_reporting_weight),
        backgroundMode: String(input.background_mode) as BackgroundMode,
        composition,
      };
    };
    const createEdition = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (current.edition && input.base_revision == null)
        return toolFailure(
          'EDITION_REQUIRES_REVISION',
          'An edition already exists. Read it and include the current revision.',
          { current_revision: current.revision },
        );
      if (current.edition && input.base_revision !== current.revision)
        return toolFailure(
          'STALE_VIEW',
          'The page changed since it was read.',
          { current_revision: current.revision },
        );
      const proposed = parseConfig(input);
      if (!proposed)
        return toolFailure(
          'MISSING_INPUT',
          'Provide all supported edition fields.',
        );
      if (current.edition) {
        if (current.lockedFields.includes('budget_seconds'))
          proposed.budgetSeconds = current.edition.budgetSeconds;
        if (current.lockedFields.includes('minimums'))
          proposed.minimums = current.edition.minimums;
        if (current.lockedFields.includes('original_reporting_weight'))
          proposed.originalReportingWeight =
            current.edition.originalReportingWeight;
        if (current.lockedFields.includes('background_mode'))
          proposed.backgroundMode = current.edition.backgroundMode;
        for (const topic of current.lockedTopics) {
          const wasExcluded = current.edition.excludedTopicIds.includes(topic),
            nowExcluded = proposed.excludedTopicIds.includes(topic);
          if (wasExcluded !== nowExcluded)
            proposed.excludedTopicIds = wasExcluded
              ? [...new Set([...proposed.excludedTopicIds, topic])]
              : proposed.excludedTopicIds.filter((id) => id !== topic);
        }
      }
      const invalid = validateConfig(proposed);
      if (invalid) return toolFailure('INVALID_EDITION', invalid);
      abortIfNeeded(signal);
      const prepared = selectEdition(
        proposed,
        current.pinnedClusters,
        current.hiddenPublications,
      );
      const reduceMotion = matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      setBuilding({ phase: 'working' });
      if (!reduceMotion)
        await new Promise((resolve) => setTimeout(resolve, 650));
      setBuilding({
        phase: 'result',
        count: prepared.selected.length,
        seconds: prepared.usedSeconds,
      });
      if (!reduceMotion)
        await new Promise((resolve) => setTimeout(resolve, 300));
      abortIfNeeded(signal);
      if (stateRef.current.revision !== current.revision) {
        setBuilding(null);
        return toolFailure(
          'STALE_VIEW',
          'The page changed while the edition was being prepared.',
          { current_revision: stateRef.current.revision },
        );
      }
      const next = commit((present) => ({
        ...present,
        edition: proposed,
        reasonClusterId: null,
      }));
      setBuilding(null);
      setLiveMessage(
        `${prepared.selected.length} developments · ${formatReadingTime(prepared.usedSeconds)}.`,
      );
      history.replaceState({ edition: false }, '');
      history.pushState({ edition: true }, '');
      await delayPaint();
      document.getElementById('tc-edition-heading')?.focus();
      return jsonSafe({
        ok: true,
        revision: next.revision,
        ...compactSelection(next),
        current_composition: serializeComposition(proposed.composition),
      });
    };
    const updateEdition = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.edition)
        return toolFailure(
          'NO_ACTIVE_EDITION',
          'Create an edition before updating it.',
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          'STALE_VIEW',
          'The page changed since it was read.',
          { current_revision: current.revision },
        );
      if (
        !Array.isArray(input.operations) ||
        !input.operations.length ||
        input.operations.length > 16
      )
        return toolFailure(
          'INVALID_OPERATIONS',
          'Provide one to sixteen supported operations.',
        );
      const draft = cloneConfig(current.edition);
      let lockedFields = [...current.lockedFields];
      let lockedTopics = [...current.lockedTopics];
      let pinnedClusters = [...current.pinnedClusters];
      let hiddenPublications = [...current.hiddenPublications];
      const changed: string[] = [];
      for (const item of input.operations) {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          return toolFailure(
            'INVALID_OPERATIONS',
            'Each operation must be an object.',
          );
        const operation = item as Record<string, unknown>,
          type = String(operation.operation);
        if (type === 'set_composition') {
          try {
            draft.composition = parseComposition(
              operation.components,
              editionCompositionOptions,
            );
          } catch (error) {
            return toolFailure(
              'INVALID_COMPOSITION',
              error instanceof Error
                ? error.message
                : 'Invalid page composition.',
            );
          }
          changed.push('composition');
          continue;
        }
        if (type === 'add_component') {
          try {
            draft.composition = insertComponent(
              draft.composition,
              parseNativeComponent(
                operation.component,
                editionCompositionOptions,
              ),
              operation.position == null
                ? undefined
                : Number(operation.position),
            );
          } catch (error) {
            return toolFailure(
              'INVALID_COMPOSITION',
              error instanceof Error ? error.message : 'Invalid component.',
            );
          }
          changed.push('composition');
          continue;
        }
        if (
          type === 'remove_component' ||
          type === 'move_component' ||
          type === 'configure_component'
        ) {
          try {
            const componentId = String(operation.component_id);
            if (type === 'remove_component')
              draft.composition = removeComponent(
                draft.composition,
                componentId,
              );
            else if (type === 'move_component')
              draft.composition = moveComponent(
                draft.composition,
                componentId,
                Number(operation.position),
              );
            else {
              const parsed = parseNativeComponentPatch(
                operation.component,
                editionCompositionOptions,
              );
              draft.composition = configureComponent(
                draft.composition,
                componentId,
                parsed,
              );
            }
          } catch (error) {
            return toolFailure(
              'INVALID_COMPOSITION',
              error instanceof Error
                ? error.message
                : 'Invalid component operation.',
            );
          }
          changed.push('composition');
          continue;
        }
        if (type === 'pin_story' || type === 'unpin_story') {
          const clusterId = String(operation.cluster_id);
          if (!clusterById.has(clusterId))
            return toolFailure(
              'UNKNOWN_CLUSTER',
              `Unknown cluster “${clusterId}”.`,
            );
          if (type === 'pin_story')
            pinnedClusters = [...new Set([...pinnedClusters, clusterId])];
          else pinnedClusters = pinnedClusters.filter((id) => id !== clusterId);
          changed.push(clusterId);
          continue;
        }
        if (type === 'hide_source' || type === 'restore_source') {
          const publication = String(operation.publication);
          if (!articles.some((article) => article.publication === publication))
            return toolFailure(
              'UNKNOWN_PUBLICATION',
              `Unknown publication “${publication}”.`,
            );
          if (type === 'hide_source')
            hiddenPublications = [
              ...new Set([...hiddenPublications, publication]),
            ];
          else
            hiddenPublications = hiddenPublications.filter(
              (id) => id !== publication,
            );
          changed.push(publication);
          continue;
        }
        if (type === 'lock_topic' || type === 'unlock_topic') {
          const topicId = String(operation.topic_id) as TopicId;
          if (!topicIds.includes(topicId))
            return toolFailure('UNKNOWN_TOPIC', `Unknown topic “${topicId}”.`);
          if (type === 'lock_topic')
            lockedTopics = [...new Set([...lockedTopics, topicId])];
          else lockedTopics = lockedTopics.filter((id) => id !== topicId);
          changed.push(topicId);
          continue;
        }
        if (type === 'lock_field' || type === 'unlock_field') {
          const fieldId = String(operation.field_id) as EditionFieldId;
          if (
            ![
              'budget_seconds',
              'minimums',
              'original_reporting_weight',
              'background_mode',
            ].includes(fieldId)
          )
            return toolFailure(
              'INVALID_OPERATION',
              `Unknown field “${fieldId}”.`,
            );
          if (type === 'lock_field')
            lockedFields = [...new Set([...lockedFields, fieldId])];
          else lockedFields = lockedFields.filter((id) => id !== fieldId);
          changed.push(fieldId);
          continue;
        }
        if (type === 'set_budget_seconds') {
          if (lockedFields.includes('budget_seconds'))
            return toolFailure(
              'LOCKED_FIELD',
              'The reading budget is locked by the reader.',
            );
          draft.budgetSeconds = Number(operation.value);
        } else if (type === 'set_topic_policy') {
          const topic = String(operation.topic_id) as TopicId;
          if (!topicIds.includes(topic))
            return toolFailure('UNKNOWN_TOPIC', `Unknown topic “${topic}”.`, {
              valid_ids: topicIds,
            });
          if (lockedTopics.includes(topic))
            return toolFailure(
              'LOCKED_TOPIC',
              `${topicLabels[topic]} is locked by the reader.`,
            );
          draft.excludedTopicIds =
            operation.policy === 'exclude'
              ? [...new Set([...draft.excludedTopicIds, topic])]
              : draft.excludedTopicIds.filter((id) => id !== topic);
        } else if (type === 'set_minimum') {
          if (lockedFields.includes('minimums'))
            return toolFailure(
              'LOCKED_FIELD',
              'Coverage minimums are locked by the reader.',
            );
          const id = String(operation.minimum_id) as MinimumId;
          if (!minimumIds.includes(id))
            return toolFailure('UNKNOWN_MINIMUM', `Unknown minimum “${id}”.`, {
              valid_ids: minimumIds,
            });
          draft.minimums[id] = Number(operation.value);
        } else if (type === 'set_original_reporting_weight') {
          if (lockedFields.includes('original_reporting_weight'))
            return toolFailure(
              'LOCKED_FIELD',
              'The original-reporting preference is locked by the reader.',
            );
          draft.originalReportingWeight = Number(operation.value);
        } else if (type === 'set_background_mode') {
          if (lockedFields.includes('background_mode'))
            return toolFailure(
              'LOCKED_FIELD',
              'The background policy is locked by the reader.',
            );
          draft.backgroundMode = String(operation.value) as BackgroundMode;
        } else
          return toolFailure(
            'INVALID_OPERATION',
            `Unsupported operation “${type}”.`,
          );
        changed.push(type);
      }
      const invalid = validateConfig(draft);
      if (invalid) return toolFailure('INVALID_EDITION', invalid);
      abortIfNeeded(signal);
      const unchanged =
        JSON.stringify(draft) === JSON.stringify(current.edition) &&
        JSON.stringify(lockedFields) === JSON.stringify(current.lockedFields) &&
        JSON.stringify(lockedTopics) === JSON.stringify(current.lockedTopics) &&
        JSON.stringify(pinnedClusters) ===
          JSON.stringify(current.pinnedClusters) &&
        JSON.stringify(hiddenPublications) ===
          JSON.stringify(current.hiddenPublications);
      if (unchanged)
        return jsonSafe({
          ok: true,
          revision: current.revision,
          changed_controls: [],
          current_composition: serializeComposition(draft.composition),
          ...compactSelection(current),
        });
      setRecomposing(true);
      const next = commit((present) => ({
        ...present,
        edition: draft,
        lockedFields,
        lockedTopics,
        pinnedClusters,
        hiddenPublications,
      }));
      await delayPaint();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        await new Promise((resolve) => setTimeout(resolve, 420));
      setRecomposing(false);
      const recomposed = selectEdition(
        draft,
        pinnedClusters,
        hiddenPublications,
      );
      setLiveMessage(
        `Edition recomposed. ${recomposed.selected.length} developments · ${formatReadingTime(recomposed.usedSeconds)}.`,
      );
      return jsonSafe({
        ok: true,
        revision: next.revision,
        changed_controls: changed,
        ...compactSelection(next),
        current_composition: serializeComposition(draft.composition),
      });
    };
    const compareCoverageHandler = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.edition)
        return toolFailure(
          'NO_ACTIVE_EDITION',
          'Create an edition before comparing coverage.',
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          'STALE_VIEW',
          'The page changed since it was read.',
          { current_revision: current.revision },
        );
      const clusterId = String(input.cluster_id),
        cluster = clusterById.get(clusterId);
      if (!cluster)
        return toolFailure(
          'UNKNOWN_CLUSTER',
          `Unknown cluster “${clusterId}”.`,
          { valid_ids: clusters.map((item) => item.id) },
        );
      const defaultIds = articles
        .filter(
          (article) =>
            article.clusterId === clusterId &&
            article.role !== 'background' &&
            !current.hiddenPublications.includes(article.publication),
        )
        .map((article) => article.id);
      const ids =
        input.article_ids === undefined ? defaultIds : input.article_ids;
      if (
        !Array.isArray(ids) ||
        ids.length < 2 ||
        ids.length > 5 ||
        ids.some(
          (id) =>
            typeof id !== 'string' ||
            articleById.get(id)?.clusterId !== clusterId,
        )
      )
        return toolFailure(
          'ARTICLE_CLUSTER_MISMATCH',
          'Choose two to five visible articles from this story cluster.',
        );
      const hidden = ids.find((id) =>
        current.hiddenPublications.includes(
          articleById.get(String(id))?.publication ?? '',
        ),
      );
      if (hidden)
        return toolFailure(
          'HIDDEN_PUBLICATION',
          `${articleById.get(String(hidden))?.publication} was hidden by the reader.`,
        );
      const result = compareCoverage(clusterId, ids as string[]);
      if (!result)
        return toolFailure(
          'INSUFFICIENT_VISIBLE_COVERAGE',
          'At least two comparable articles are required.',
        );
      abortIfNeeded(signal);
      replaceTransient((present) => ({
        ...present,
        comparison: { clusterId, articleIds: ids as string[] },
        reasonClusterId: null,
      }));
      await delayPaint();
      return jsonSafe({
        ok: true,
        revision: current.revision,
        comparison: result,
      });
    };
    const showSelectionReason = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.edition)
        return toolFailure(
          'NO_ACTIVE_EDITION',
          'Create an edition before opening a selection reason.',
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          'STALE_VIEW',
          'The page changed since it was read.',
          { current_revision: current.revision },
        );
      const clusterId = String(input.cluster_id),
        selection = selectEdition(
          current.edition,
          current.pinnedClusters,
          current.hiddenPublications,
        ),
        candidate = selection.selected.find(
          (item) => item.cluster.id === clusterId,
        );
      if (!candidate)
        return toolFailure(
          'STORY_NOT_SELECTED',
          'That story is not in the current edition.',
          {
            selected_cluster_ids: selection.selected.map(
              (item) => item.cluster.id,
            ),
          },
        );
      abortIfNeeded(signal);
      replaceTransient((present) => ({
        ...present,
        reasonClusterId: clusterId,
        comparison: null,
      }));
      await delayPaint();
      return jsonSafe({
        ok: true,
        revision: current.revision,
        reason: selectionReason(candidate, selection, current.edition),
      });
    };
    return {
      readPage,
      createEdition,
      updateEdition,
      compareCoverage: compareCoverageHandler,
      showSelectionReason,
    };
  }, [commit, replaceTransient]);

  useEffect(() => {
    if (!hydrated) return;
    const registration = registerEditionTools(handlers);
    queueMicrotask(() => setMcpAvailable(registration.available));
    return registration.abort;
  }, [handlers, hydrated]);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (event.state?.edition === false && stateRef.current.edition) {
        replaceTransient((current) => ({
          ...current,
          edition: null,
          reasonClusterId: null,
          comparison: null,
        }));
      } else if (event.state?.edition === true && !stateRef.current.edition) {
        const prior = [...stateRef.current.past]
          .reverse()
          .find((entry) => entry.edition)?.edition;
        if (prior)
          replaceTransient((current) => ({ ...current, edition: prior }));
      }
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [replaceTransient]);

  if (!hydrated) return <div className="tc-hydration-shell" aria-busy="true" />;
  return (
    <div
      className={`current-app${building ? ' is-building' : ''}${recomposing ? ' is-recomposing' : ''}`}
    >
      <CurrentHeader mcpAvailable={mcpAvailable} />
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      {building && (
        <output className="tc-building">
          <span />
          {building.phase === 'working'
            ? 'Collapsing 30 headlines into new developments…'
            : `${building.count ?? 0} developments · ${formatReadingTime(building.seconds ?? 0)}.`}
        </output>
      )}
      {state.edition?.composition?.length ? (
        <ComposedEditionPage
          state={state}
          commit={commit}
          replaceTransient={replaceTransient}
          undo={undo}
          redo={redo}
          announce={setLiveMessage}
        />
      ) : state.edition ? (
        <DecisionPage
          state={state}
          commit={commit}
          replaceTransient={replaceTransient}
          undo={undo}
          redo={redo}
          announce={setLiveMessage}
        />
      ) : (
        <StandardPage />
      )}
    </div>
  );
}

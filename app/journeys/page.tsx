"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  EyeOff,
  Footprints,
  Leaf,
  Lock,
  LockOpen,
  MapPin,
  Plane,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Undo2,
  X,
} from "lucide-react";
import {
  arrivalTimeZoneOffsetMinutes,
  defaultJourneyView,
  evaluateJourneys,
  explainJourney,
  formatClock,
  formatDuration,
  journeyById,
  journeyCalculationMetricIds,
  journeyDestinations,
  journeyOrigins,
  journeyRelaxations,
  journeyViewTitle,
  journeys,
  type JourneyAssumptions,
  type JourneyCalculationMetricId,
  type JourneyEvaluation,
  type JourneyMetricId,
  type JourneyOrigin,
  type JourneyDestination,
  type JourneyRequirementId,
  type JourneyView,
} from "@/lib/journeys";
import {
  registerJourneyTools,
  type JourneyWebMcpHandlers,
} from "@/lib/journey-webmcp";

const STORAGE_KEY = "wayline-journey-view-v1";
const JOURNEY_HOME = "/journeys";
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
const calculationLabels: Record<JourneyCalculationMetricId, string> = {
  door_to_door_time: "Total door-to-door time",
  arrival_time: "Calculated local arrival",
  walking_distance: "Calculated walking distance",
  disruption_risk: "Estimated disruption risk",
  arrival_slack: "Calculated arrival slack",
};
const comparisonRowIds = [
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
] as const;
type ComparisonRowId = (typeof comparisonRowIds)[number];
type ControlId = keyof JourneyAssumptions;
type CalculationState = {
  journeyId: string;
  metricId: JourneyCalculationMetricId;
} | null;
type Snapshot = {
  view: JourneyView | null;
  locked: ControlId[];
  saved: string[];
  hidden: string[];
  compared: string[];
  comparisonRows: ComparisonRowId[] | null;
  calculation: CalculationState;
  showExcluded: boolean;
};
type AppState = Snapshot & {
  revision: number;
  past: Snapshot[];
  future: Snapshot[];
};

const blankState: AppState = {
  view: null,
  locked: [],
  saved: [],
  hidden: [],
  compared: [],
  comparisonRows: null,
  calculation: null,
  showExcluded: false,
  revision: 0,
  past: [],
  future: [],
};

const snapshotOf = (state: AppState): Snapshot => ({
  view: state.view,
  locked: state.locked,
  saved: state.saved,
  hidden: state.hidden,
  compared: state.compared,
  comparisonRows: state.comparisonRows,
  calculation: state.calculation,
  showExcluded: state.showExcluded,
});
const jsonSafe = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const cloneView = (view: JourneyView): JourneyView => jsonSafe(view);
const delayPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
const abortIfNeeded = (signal?: AbortSignal) => signal?.throwIfAborted();
const plural = (count: number, singular: string, many = `${singular}s`) =>
  Math.abs(count) === 1 ? singular : many;
const toolFailure = (
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
) => ({ ok: false, error: { code, message, ...extra } });

const handleDialogKey = (
  event: ReactKeyboardEvent<HTMLElement>,
  close: () => void,
) => {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;
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
  const restoreSnapshot = (item: Partial<Snapshot> | undefined): Snapshot => ({
    view: item?.view ?? null,
    locked:
      item?.locked?.filter((id) =>
        [
          "origin",
          "destination",
          "checked_bag",
          "arrival_deadline_minutes",
          "minimum_connection_slack_minutes",
          "reliability_weight",
        ].includes(id),
      ) ?? [],
    saved: item?.saved?.filter((id) => journeyById.has(id)) ?? [],
    hidden: item?.hidden?.filter((id) => journeyById.has(id)) ?? [],
    compared:
      item?.compared?.filter((id) => journeyById.has(id)).slice(0, 4) ?? [],
    comparisonRows:
      item?.comparisonRows?.filter((id) => comparisonRowIds.includes(id)) ??
      null,
    calculation:
      item?.calculation &&
      journeyById.has(item.calculation.journeyId) &&
      journeyCalculationMetricIds.includes(item.calculation.metricId)
        ? item.calculation
        : null,
    showExcluded: item?.showExcluded ?? false,
  });
  return {
    ...restoreSnapshot(raw),
    revision: typeof raw.revision === "number" ? raw.revision : 0,
    past: (raw.past ?? []).map((item) => restoreSnapshot(item)),
    future: (raw.future ?? []).map((item) => restoreSnapshot(item)),
  };
}

function validateView(view: JourneyView) {
  const { assumptions } = view;
  if (!view.title.trim() || view.title.length > 80)
    return "Title must contain 1–80 characters.";
  if (
    !(assumptions.origin in journeyOrigins) ||
    !(assumptions.destination in journeyDestinations)
  )
    return "Choose a supported origin and destination.";
  if (typeof assumptions.checked_bag !== "boolean")
    return "checked_bag must be true or false.";
  if (
    !Number.isInteger(assumptions.arrival_deadline_minutes) ||
    assumptions.arrival_deadline_minutes < 600 ||
    assumptions.arrival_deadline_minutes > 1439
  )
    return "Arrival deadline must be a minute of day between 10:00 and 23:59.";
  if (
    !Number.isInteger(assumptions.minimum_connection_slack_minutes) ||
    assumptions.minimum_connection_slack_minutes < 0 ||
    assumptions.minimum_connection_slack_minutes > 120
  )
    return "Minimum connection slack must be 0–120 minutes.";
  if (
    !Number.isFinite(assumptions.reliability_weight) ||
    assumptions.reliability_weight < 0 ||
    assumptions.reliability_weight > 1
  )
    return "Reliability weight must be between 0 and 1.";
  if (
    view.requirements.some((id) => !requirementIds.includes(id)) ||
    new Set(view.requirements).size !== view.requirements.length
  )
    return "Requirements must use unique supported IDs.";
  if (
    !view.visibleMetricIds.length ||
    view.visibleMetricIds.length > 7 ||
    view.visibleMetricIds.some((id) => !metricIds.includes(id))
  )
    return "Choose one to seven supported metrics.";
  if (!metricIds.includes(view.primarySort.metricId))
    return "Choose a supported primary sort metric.";
  return null;
}

function SiteLinks({
  current,
}: {
  current: "washers" | "journeys" | "edition";
}) {
  const links = [
    { id: "washers", href: "/", label: "Hearth & Home washers" },
    { id: "journeys", href: "/journeys", label: "Wayline journeys" },
    { id: "edition", href: "/edition", label: "The Current edition" },
  ].filter((link) => link.id !== current);
  return (
    <nav className="wl-more" aria-label="More live WebMCP examples">
      <strong>More live WebMCP examples</strong>
      {links.map((link) => (
        <a key={link.id} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function WaylineHeader({ mcpAvailable }: { mcpAvailable: boolean }) {
  return (
    <>
      <header className="wl-header">
        <a className="wl-brand" href={JOURNEY_HOME} aria-label="Wayline home">
          <span>W</span>Wayline
        </a>
        <nav aria-label="Primary">
          <a href="#results">Trips</a>
          <a href="#help">Help</a>
          <a href="#saved">Saved</a>
        </nav>
        <button type="button" className="wl-profile" aria-label="Profile">
          EP
        </button>
      </header>
      {mcpAvailable && (
        <div className="wl-assistant">
          <Sparkles size={14} /> Works with your browser assistant
        </div>
      )}
    </>
  );
}

function ConventionalJourney({ row }: { row: JourneyEvaluation }) {
  const item = row.journey;
  return (
    <article className="wl-search-card">
      <div className="wl-mode-icon">
        {item.mode === "rail" ? <TrainFront /> : <Plane />}
      </div>
      <div className="wl-search-times">
        <div>
          <strong>{formatClock(item.departureMinute)}</strong>
          <span>{item.departureTerminal}</span>
        </div>
        <div className="wl-duration-rule">
          <span>{formatDuration(item.advertisedMinutes)}</span>
          <i />
        </div>
        <div>
          <strong>
            {formatClock(
              item.departureMinute +
                item.advertisedMinutes +
                arrivalTimeZoneOffsetMinutes,
            )}
          </strong>
          <span>{item.arrivalTerminal}</span>
        </div>
      </div>
      <div className="wl-search-meta">
        <strong>{item.operator}</strong>
        <span>
          {item.direct ? "Direct" : "1 connection"} · {item.luggageRule}
        </span>
      </div>
      <div className="wl-search-price">
        <span>from</span>
        <strong>£{item.fare}</strong>
        <button type="button">
          Select <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}

function StandardPage() {
  const [mode, setMode] = useState<"all" | "rail" | "flight">("all");
  const [connections, setConnections] = useState<"all" | "direct">("all");
  const [maxPrice, setMaxPrice] = useState(180);
  const [departAfter, setDepartAfter] = useState(420);
  const [sort, setSort] = useState<"duration" | "price" | "departure">(
    "duration",
  );
  const rows = useMemo(() => {
    const config = {
      ...defaultJourneyView,
      requirements: [] as JourneyRequirementId[],
    };
    return evaluateJourneys(config)
      .all.filter(
        (row) =>
          (mode === "all" || row.journey.mode === mode) &&
          (connections === "all" || row.journey.direct) &&
          row.journey.fare <= maxPrice &&
          row.journey.departureMinute >= departAfter,
      )
      .sort((a, b) =>
        sort === "price"
          ? a.journey.fare - b.journey.fare
          : sort === "departure"
            ? a.journey.departureMinute - b.journey.departureMinute
            : a.journey.advertisedMinutes - b.journey.advertisedMinutes,
      );
  }, [connections, departAfter, maxPrice, mode, sort]);
  return (
    <main className="wl-shell wl-standard" id="top">
      <section className="wl-search-hero">
        <Image
          className="wl-hero-photo"
          src="/journeys/amsterdam-rail-platforms.png"
          alt="Travellers beside an unbranded intercity train at Amsterdam Centraal"
          fill
          priority
          sizes="(max-width: 720px) 100vw, 1300px"
        />
        <div className="wl-hero-shade" aria-hidden="true" />
        <div className="wl-search-hero-copy">
          <p className="wl-kicker">London → Amsterdam · Tue 8 September</p>
          <h1>Choose your way to Amsterdam</h1>
        </div>
        <form
          className="wl-route-search"
          onSubmit={(event) => event.preventDefault()}
        >
          <div>
            <span>From</span>
            <strong>Shoreditch, London</strong>
          </div>
          <ArrowRight aria-hidden="true" />
          <div>
            <span>To</span>
            <strong>Jordaan, Amsterdam</strong>
          </div>
          <div>
            <span>Travellers</span>
            <strong>1 adult</strong>
          </div>
          <button type="submit">Search</button>
        </form>
      </section>
      <div className="wl-standard-layout" id="results">
        <aside className="wl-filters" aria-label="Journey filters">
          <div>
            <strong>Filter journeys</strong>
            <button
              type="button"
              onClick={() => {
                setMode("all");
                setConnections("all");
                setMaxPrice(180);
                setDepartAfter(420);
              }}
            >
              Clear
            </button>
          </div>
          <label>
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
            >
              <option value="all">All modes</option>
              <option value="rail">Rail</option>
              <option value="flight">Flight</option>
            </select>
          </label>
          <label>
            Connections
            <select
              value={connections}
              onChange={(event) =>
                setConnections(event.target.value as typeof connections)
              }
            >
              <option value="all">Any</option>
              <option value="direct">Direct only</option>
            </select>
          </label>
          <label>
            Maximum price<strong>£{maxPrice}</strong>
            <input
              type="range"
              min="50"
              max="180"
              step="5"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
            />
          </label>
          <label>
            Depart after
            <input
              type="time"
              value={formatClock(departAfter)}
              onChange={(event) => {
                const [hours, minutes] = event.target.value
                  .split(":")
                  .map(Number);
                setDepartAfter(hours * 60 + minutes);
              }}
            />
          </label>
        </aside>
        <section className="wl-standard-results">
          <div className="wl-results-toolbar">
            <div>
              <strong>{rows.length} journeys</strong>
              <span>Shoreditch to the Jordaan</span>
            </div>
            <label>
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="duration">Shortest journey</option>
                <option value="price">Lowest price</option>
                <option value="departure">Departure time</option>
              </select>
            </label>
          </div>
          <p className="wl-search-note">
            <Clock3 size={15} /> Durations shown by operators cover the booked
            transport, not your full trip to and from terminals.
          </p>
          <div className="wl-search-list">
            {rows.map((row) => (
              <ConventionalJourney key={row.journey.id} row={row} />
            ))}
          </div>
          {!rows.length && (
            <div className="wl-empty">
              <h2>No journeys match those filters</h2>
              <p>Clear a filter to see the full timetable.</p>
            </div>
          )}
        </section>
      </div>
      <footer className="wl-footer" id="help">
        <p>
          Schedules, operators, fares and performance bands are fictional
          deterministic demonstration data. No live availability is shown.
        </p>
        <SiteLinks current="journeys" />
      </footer>
    </main>
  );
}

function JourneyControls({
  state,
  commit,
  announce,
}: {
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  announce: (message: string) => void;
}) {
  const view = state.view!;
  const setAssumption = <K extends ControlId>(
    id: K,
    value: JourneyAssumptions[K],
  ) => {
    const next = commit((current) => ({
      ...current,
      view: {
        ...current.view!,
        assumptions: { ...current.view!.assumptions, [id]: value },
      },
    }));
    announce(
      `${id.replaceAll("_", " ")} updated. ${evaluateJourneys(next.view!, next.hidden).ranked.length} journeys now qualify.`,
    );
  };
  const lockButton = (id: ControlId, label: string) => (
    <button
      type="button"
      className="wl-lock"
      onClick={() =>
        commit((current) => ({
          ...current,
          locked: current.locked.includes(id)
            ? current.locked.filter((item) => item !== id)
            : [...current.locked, id],
        }))
      }
      aria-label={`${state.locked.includes(id) ? "Unlock" : "Lock"} ${label}`}
    >
      {state.locked.includes(id) ? <Lock size={13} /> : <LockOpen size={13} />}
    </button>
  );
  return (
    <section className="wl-controls" aria-labelledby="wl-controls-title">
      <div className="wl-section-heading">
        <div>
          <p className="wl-kicker">Your journey</p>
          <h2 id="wl-controls-title">Inputs that change every result</h2>
        </div>
        <p>Lock any choice an assistant must preserve.</p>
      </div>
      <div className="wl-control-grid">
        <div className={state.locked.includes("origin") ? "is-locked" : ""}>
          <label htmlFor="wl-origin">Starting location</label>
          {lockButton("origin", "starting location")}
          <select
            id="wl-origin"
            value={view.assumptions.origin}
            onChange={(event) =>
              setAssumption("origin", event.target.value as JourneyOrigin)
            }
          >
            {Object.entries(journeyOrigins).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div
          className={state.locked.includes("destination") ? "is-locked" : ""}
        >
          <label htmlFor="wl-destination">Staying in</label>
          {lockButton("destination", "destination")}
          <select
            id="wl-destination"
            value={view.assumptions.destination}
            onChange={(event) =>
              setAssumption(
                "destination",
                event.target.value as JourneyDestination,
              )
            }
          >
            {Object.entries(journeyDestinations).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div
          className={state.locked.includes("checked_bag") ? "is-locked" : ""}
        >
          <label htmlFor="wl-bag">Luggage</label>
          {lockButton("checked_bag", "luggage")}
          <select
            id="wl-bag"
            value={view.assumptions.checked_bag ? "checked" : "carry-on"}
            onChange={(event) =>
              setAssumption("checked_bag", event.target.value === "checked")
            }
          >
            <option value="checked">Checked bag</option>
            <option value="carry-on">Carry-on only</option>
          </select>
        </div>
        <div
          className={
            state.locked.includes("arrival_deadline_minutes") ? "is-locked" : ""
          }
        >
          <label htmlFor="wl-deadline">Arrive by</label>
          {lockButton("arrival_deadline_minutes", "arrival deadline")}
          <input
            id="wl-deadline"
            type="time"
            value={formatClock(view.assumptions.arrival_deadline_minutes)}
            onChange={(event) => {
              const [hours, minutes] = event.target.value
                .split(":")
                .map(Number);
              setAssumption("arrival_deadline_minutes", hours * 60 + minutes);
            }}
          />
        </div>
      </div>
    </section>
  );
}

function JourneyPlot({
  rows,
  onExplain,
}: {
  rows: JourneyEvaluation[];
  onExplain: (id: string) => void;
}) {
  if (!rows.length) return null;
  const width = 780,
    height = 310,
    left = 64,
    right = 28,
    top = 34,
    bottom = 48;
  const times = rows.map((row) => row.totalMinutes),
    risks = rows.map((row) => row.riskPercent);
  const minTime = Math.min(...times) - 8,
    maxTime = Math.max(...times) + 8;
  const rawMinRisk = Math.min(...risks),
    rawMaxRisk = Math.max(...risks);
  const minRisk = Math.max(0, Math.floor(rawMinRisk - 2)),
    maxRisk = Math.ceil(rawMaxRisk + 2);
  const x = (value: number) =>
    left +
    ((value - minTime) / Math.max(1, maxTime - minTime)) *
      (width - left - right);
  const y = (value: number) =>
    height -
    bottom -
    ((value - minRisk) / Math.max(1, maxRisk - minRisk)) *
      (height - top - bottom);
  return (
    <section className="wl-plot-card" aria-labelledby="wl-plot-title">
      <div className="wl-section-heading">
        <div>
          <p className="wl-kicker">The full trip</p>
          <h2 id="wl-plot-title">Door-to-door time against disruption risk</h2>
        </div>
        <p>Lower and further left is stronger.</p>
      </div>
      <div className="wl-plot-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} aria-labelledby="wl-svg-title">
          <title id="wl-svg-title">
            Eligible journeys plotted by total door-to-door time and disruption
            risk
          </title>
          <line
            x1={left}
            y1={height - bottom}
            x2={width - right}
            y2={height - bottom}
          />
          <line x1={left} y1={top} x2={left} y2={height - bottom} />
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={`x-${tick}`}>
              <text
                x={left + tick * (width - left - right)}
                y={height - 18}
                textAnchor="middle"
              >
                {formatDuration(minTime + tick * (maxTime - minTime))}
              </text>
            </g>
          ))}
          {[0, 0.5, 1].map((tick) => (
            <g key={`y-${tick}`}>
              <text
                x={left - 10}
                y={y(minRisk + tick * (maxRisk - minRisk)) + 4}
                textAnchor="end"
              >
                {(minRisk + tick * (maxRisk - minRisk)).toFixed(0)}%
              </text>
            </g>
          ))}
          {rows.map((row) => (
            <a
              key={row.journey.id}
              href={`#${row.journey.id}`}
              className={`wl-plot-point ${row.rank === 1 ? "best" : ""}`}
              aria-label={`${row.journey.operator}, ${formatDuration(row.totalMinutes)}, ${row.riskPercent.toFixed(1)} percent risk`}
              onClick={(event) => {
                event.preventDefault();
                onExplain(row.journey.id);
              }}
            >
              <circle
                cx={x(row.totalMinutes)}
                cy={y(row.riskPercent)}
                r={row.rank === 1 ? 11 : 8}
              />
              <text
                x={x(row.totalMinutes)}
                y={y(row.riskPercent) - 14}
                textAnchor="middle"
              >
                {row.journey.service}
              </text>
            </a>
          ))}
          <text
            className="wl-axis-label"
            x={width / 2}
            y={height - 2}
            textAnchor="middle"
          >
            Total door-to-door time
          </text>
          <text
            className="wl-axis-label"
            x="14"
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${height / 2})`}
          >
            Disruption risk
          </text>
        </svg>
      </div>
    </section>
  );
}

function JourneyCard({
  row,
  state,
  commit,
  openCalculation,
}: {
  row: JourneyEvaluation;
  state: AppState;
  commit: (fn: (state: AppState) => AppState) => AppState;
  openCalculation: (id: string, metric: JourneyCalculationMetricId) => void;
}) {
  const journey = row.journey;
  const saved = state.saved.includes(journey.id),
    compared = state.compared.includes(journey.id);
  const visibleMetrics = new Set(state.view!.visibleMetricIds);
  return (
    <article
      className={`wl-journey-card ${journey.id === "wl-flight-1200" ? "wl-wow-card" : ""}`}
      id={`journey-${journey.id}`}
    >
      <div className="wl-rank">
        <span>
          {row.rank === 1
            ? "Best match for your balance"
            : `#${row.rank} for your balance`}
        </span>
        <strong>
          {journey.operator} · {journey.service}
        </strong>
      </div>
      <div className="wl-journey-summary">
        <div>
          <span>{formatClock(journey.departureMinute)}</span>
          <small>{journey.departureTerminal}</small>
        </div>
        {visibleMetrics.has("door_to_door_time") ? (
          <button
            type="button"
            className="wl-primary-calc"
            onClick={() => openCalculation(journey.id, "door_to_door_time")}
          >
            <small>Door to door</small>
            <strong>{formatDuration(row.totalMinutes)}</strong>
            <CircleHelp size={16} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          className="wl-arrival-calc"
          aria-label={`Explain arrival time ${formatClock(row.arrivalMinute)} at ${journeyDestinations[state.view!.assumptions.destination]}`}
          onClick={() => openCalculation(journey.id, "arrival_time")}
        >
          <span>{formatClock(row.arrivalMinute)}</span>
          <small>
            {journeyDestinations[state.view!.assumptions.destination]}
          </small>
          <CircleHelp size={16} aria-hidden="true" />
        </button>
        {visibleMetrics.has("fare") ? (
          <div className="wl-price">
            <small>Fare</small>
            <strong>£{journey.fare}</strong>
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      {journey.id === "wl-flight-1200" && (
        <div className="wl-reveal">
          <Plane size={17} />
          <strong>{formatDuration(journey.advertisedMinutes)} in search</strong>
          <ArrowRight size={15} />
          <strong>{formatDuration(row.totalMinutes)} door to door</strong>
          <button
            type="button"
            onClick={() => openCalculation(journey.id, "door_to_door_time")}
          >
            See every minute
          </button>
        </div>
      )}
      <ol
        className="wl-timeline"
        aria-label={`${journey.operator} journey legs`}
      >
        {journey.legs.map((leg, index) => (
          <li key={`${journey.id}-${leg.label}-${index}`}>
            <span>
              {leg.mode === "flight" ? (
                <Plane size={15} />
              ) : leg.mode === "walk" ? (
                <Footprints size={15} />
              ) : (
                <TrainFront size={15} />
              )}
            </span>
            <div>
              <strong>{leg.label}</strong>
              <small>
                {leg.from} → {leg.to}
              </small>
              <em>{leg.minutes} min</em>
            </div>
          </li>
        ))}
      </ol>
      <div className="wl-journey-facts">
        {visibleMetrics.has("walking_distance") && (
          <button
            type="button"
            aria-label={`Explain walking distance ${row.walkingKm.toFixed(1)} kilometres`}
            onClick={() => openCalculation(journey.id, "walking_distance")}
          >
            <Footprints size={15} />
            <small>Walking</small>
            <strong>{row.walkingKm.toFixed(1)} km</strong>
          </button>
        )}
        {visibleMetrics.has("disruption_risk") && (
          <button
            type="button"
            onClick={() => openCalculation(journey.id, "disruption_risk")}
          >
            <ShieldCheck size={15} />
            <small>Disruption risk</small>
            <strong>{row.riskPercent.toFixed(1)}%</strong>
          </button>
        )}
        {visibleMetrics.has("arrival_slack") && (
          <button
            type="button"
            aria-label={`Explain arrival slack ${row.arrivalSlackMinutes} minutes`}
            onClick={() => openCalculation(journey.id, "arrival_slack")}
          >
            <CalendarClock size={15} />
            <small>Arrival slack</small>
            <strong>{row.arrivalSlackMinutes} min</strong>
          </button>
        )}
        <span>
          <Briefcase size={15} />
          <small>Checked-bag effect</small>
          <strong>
            {state.view!.assumptions.checked_bag
              ? `+${journey.checkedBagMinutes} min`
              : "None"}
          </strong>
        </span>
        {visibleMetrics.has("carbon") && (
          <span>
            <Leaf size={15} />
            <small>Carbon</small>
            <strong>{journey.carbonKg} kg</strong>
          </span>
        )}
        {visibleMetrics.has("advertised_duration") && (
          <span>
            <Clock3 size={15} />
            <small>Advertised</small>
            <strong>{formatDuration(journey.advertisedMinutes)}</strong>
          </span>
        )}
      </div>
      <div className="wl-card-actions">
        <button
          type="button"
          className={saved ? "active" : ""}
          onClick={() =>
            commit((current) => ({
              ...current,
              saved: saved
                ? current.saved.filter((id) => id !== journey.id)
                : [...current.saved, journey.id],
            }))
          }
        >
          <Save size={15} />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className={compared ? "active" : ""}
          disabled={!compared && state.compared.length >= 4}
          onClick={() =>
            commit((current) => ({
              ...current,
              compared: compared
                ? current.compared.filter((id) => id !== journey.id)
                : [...current.compared, journey.id],
            }))
          }
        >
          {compared ? <Check size={15} /> : <ArrowRight size={15} />}{" "}
          {compared ? "Selected" : "Compare"}
        </button>
        <button
          type="button"
          onClick={() =>
            commit((current) => ({
              ...current,
              hidden: [...current.hidden, journey.id],
              compared: current.compared.filter((id) => id !== journey.id),
            }))
          }
        >
          <EyeOff size={15} />
          Hide
        </button>
      </div>
    </article>
  );
}

function JourneyComparison({
  state,
  rows,
  close,
  remove,
}: {
  state: AppState;
  rows: JourneyEvaluation[];
  close: () => void;
  remove: (id: string) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobileModal, setIsMobileModal] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobileModal(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!isMobileModal) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isMobileModal]);
  const compared = state.compared
    .map((id) => rows.find((row) => row.journey.id === id))
    .filter(Boolean) as JourneyEvaluation[];
  if (compared.length < 2) return null;
  const definitions: Array<{
    id: ComparisonRowId;
    label: string;
    value: (row: JourneyEvaluation) => string;
  }> = [
    {
      id: "door_to_door_time",
      label: "Door-to-door time",
      value: (row) => formatDuration(row.totalMinutes),
    },
    {
      id: "advertised_duration",
      label: "Advertised duration",
      value: (row) => formatDuration(row.journey.advertisedMinutes),
    },
    {
      id: "walking_distance",
      label: "Walking distance",
      value: (row) => `${row.walkingKm.toFixed(1)} km`,
    },
    {
      id: "disruption_risk",
      label: "Disruption risk",
      value: (row) => `${row.riskPercent.toFixed(1)}%`,
    },
    {
      id: "arrival_slack",
      label: "Arrival slack",
      value: (row) => `${row.arrivalSlackMinutes} min`,
    },
    { id: "fare", label: "Fare", value: (row) => `£${row.journey.fare}` },
    {
      id: "carbon",
      label: "Carbon estimate",
      value: (row) => `${row.journey.carbonKg} kg CO₂e`,
    },
    {
      id: "connections",
      label: "Connections",
      value: (row) =>
        row.journey.direct
          ? "Direct"
          : `1 · ${row.journey.connectionSlackMinutes} min slack`,
    },
    {
      id: "luggage",
      label: "Luggage",
      value: (row) => row.journey.luggageRule,
    },
    {
      id: "punctuality",
      label: "Historical punctuality",
      value: (row) => row.journey.punctualityBand,
    },
    {
      id: "accessibility",
      label: "Accessibility",
      value: (row) => row.journey.accessibility.join(" · "),
    },
  ];
  const selected = state.comparisonRows
    ? (state.comparisonRows
        .map((id) => definitions.find((definition) => definition.id === id))
        .filter(Boolean) as typeof definitions)
    : definitions.slice(0, 8);
  const comparisonContent = (
    <>
      <div className="wl-section-heading">
        <div>
          <p className="wl-kicker">Side by side</p>
          <h2 id="wl-comparison-title">Journey comparison</h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Close journey comparison"
        >
          <X />
        </button>
      </div>
      <p className="wl-swipe-hint">
        Swipe to see the next journey <span aria-hidden="true">→</span>
      </p>
      <section
        className="wl-comparison-scroll"
        aria-label="Journey comparison table"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">What matters</th>
              {compared.map((row) => (
                <th scope="col" key={row.journey.id}>
                  <button
                    type="button"
                    onClick={() => remove(row.journey.id)}
                    aria-label={`Remove ${row.journey.service}`}
                  >
                    <X size={13} />
                  </button>
                  <span>{row.journey.operator}</span>
                  <strong>{row.journey.service}</strong>
                  <em>
                    {formatClock(row.journey.departureMinute)} · £
                    {row.journey.fare}
                  </em>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.map((definition) => (
              <tr key={definition.id}>
                <th scope="row">{definition.label}</th>
                {compared.map((row) => (
                  <td key={row.journey.id}>{definition.value(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
  if (isMobileModal)
    return (
      <dialog
        open
        aria-modal="true"
        className="wl-comparison"
        aria-labelledby="wl-comparison-title"
        onKeyDown={(event) => handleDialogKey(event, close)}
      >
        {comparisonContent}
      </dialog>
    );
  return (
    <section className="wl-comparison" aria-labelledby="wl-comparison-title">
      {comparisonContent}
    </section>
  );
}

function CalculationDialog({
  state,
  close,
}: {
  state: AppState;
  close: () => void;
}) {
  if (!state.calculation || !state.view) return null;
  const journey = journeyById.get(state.calculation.journeyId);
  if (!journey) return null;
  const explanation = explainJourney(
    journey,
    state.view,
    state.calculation.metricId,
  );
  return (
    <div className="wl-dialog-backdrop">
      <dialog
        open
        aria-modal="true"
        className="wl-calculation"
        aria-labelledby="wl-calculation-title"
        onKeyDown={(event) => handleDialogKey(event, close)}
      >
        <button
          type="button"
          autoFocus
          className="wl-dialog-close"
          onClick={close}
          aria-label="Close calculation"
        >
          <X />
        </button>
        <p className="wl-kicker">
          {journey.operator} · {journey.service}
        </p>
        <h2 id="wl-calculation-title">How Wayline calculated this</h2>
        <p>Site-owned facts and arithmetic, with no generated estimates.</p>
        <div className="wl-calc-result">
          <span>{calculationLabels[state.calculation.metricId]}</span>
          <strong>{explanation.formattedResult}</strong>
        </div>
        <section>
          <h3>Current traveller inputs</h3>
          <dl>
            <div>
              <dt>Starting point</dt>
              <dd>{journeyOrigins[state.view.assumptions.origin]}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{journeyDestinations[state.view.assumptions.destination]}</dd>
            </div>
            <div>
              <dt>Luggage</dt>
              <dd>
                {state.view.assumptions.checked_bag
                  ? "Checked bag"
                  : "Carry-on only"}
              </dd>
            </div>
            <div>
              <dt>Arrival deadline</dt>
              <dd>
                {formatClock(state.view.assumptions.arrival_deadline_minutes)}
              </dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>Calculation components</h3>
          <dl>
            {explanation.components.map((component) => (
              <div key={component.id}>
                <dt>{component.label}</dt>
                <dd>{component.formattedValue}</dd>
              </div>
            ))}
          </dl>
          <p className="wl-arithmetic">{explanation.arithmetic}</p>
        </section>
        <section className="wl-calc-exclusions">
          <h3>Not included</h3>
          <p>{explanation.exclusions.join(" · ")}</p>
        </section>
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
  const view = state.view!;
  const result = useMemo(
    () => evaluateJourneys(view, state.hidden),
    [state.hidden, view],
  );
  const openCalculation = (
    journeyId: string,
    metricId: JourneyCalculationMetricId,
  ) =>
    replaceTransient((current) => ({
      ...current,
      calculation: { journeyId, metricId },
    }));
  const relaxations = journeyRelaxations(view, state.hidden);
  const selectedRows = result.all;
  return (
    <main className="wl-shell wl-decision" id="top">
      <section className="wl-decision-hero">
        <div>
          <p className="wl-kicker">Door to door · built for this trip</p>
          <h1 tabIndex={-1} id="wl-decision-heading">
            {view.title}
          </h1>
          <p>
            The booked journey is only one part of getting there. Wayline now
            ranks the complete trip.
          </p>
        </div>
        <div className="wl-history">
          <button type="button" onClick={undo} disabled={!state.past.length}>
            <Undo2 size={15} />
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!state.future.length}>
            Redo
            <Redo2 size={15} />
          </button>
        </div>
      </section>
      <div className="wl-chips">
        <span>
          <MapPin size={14} />
          {journeyOrigins[view.assumptions.origin]}
        </span>
        <span>
          <ArrowRight size={14} />
          {journeyDestinations[view.assumptions.destination]}
        </span>
        <span>
          <Briefcase size={14} />
          {view.assumptions.checked_bag ? "Checked bag" : "Carry-on only"}
        </span>
        <span>
          <CalendarClock size={14} />
          By {formatClock(view.assumptions.arrival_deadline_minutes)}
        </span>
        <span>
          <ShieldCheck size={14} />
          {Math.round(view.assumptions.reliability_weight * 100)}% reliability
        </span>
      </div>
      <JourneyControls state={state} commit={commit} announce={announce} />
      <section className="wl-balance" aria-labelledby="wl-balance-title">
        <div>
          <p className="wl-kicker">Your priorities</p>
          <h2 id="wl-balance-title">Speed versus reliability</h2>
          <p>Walking distance remains a visible tie-breaker.</p>
        </div>
        <div>
          <div>
            <strong>Faster</strong>
            <strong>More reliable</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(view.assumptions.reliability_weight * 100)}
            aria-label="Reliability priority"
            onChange={(event) =>
              commit((current) => ({
                ...current,
                view: {
                  ...current.view!,
                  assumptions: {
                    ...current.view!.assumptions,
                    reliability_weight: Number(event.target.value) / 100,
                  },
                },
              }))
            }
          />
          <p>
            {Math.round((1 - view.assumptions.reliability_weight) * 100)}% speed
            · {Math.round(view.assumptions.reliability_weight * 100)}%
            reliability
          </p>
        </div>
      </section>
      <section className="wl-eligibility">
        <strong>{result.ranked.length}</strong>
        <div>
          <h2>
            of {result.all.length} visible journeys meet every requirement.
          </h2>
          <p>
            {result.excluded.length
              ? `${result.excluded.length} are excluded with an exact reason.`
              : "Every visible journey qualifies."}
          </p>
        </div>
        {result.excluded.length > 0 && (
          <button
            type="button"
            onClick={() =>
              commit((current) => ({
                ...current,
                showExcluded: !current.showExcluded,
              }))
            }
          >
            {state.showExcluded ? "Hide" : "Show"} exclusions{" "}
            <ChevronDown size={15} />
          </button>
        )}
      </section>
      {state.showExcluded && (
        <section className="wl-exclusions">
          <p className="wl-kicker">Exact exclusions</p>
          <h2>Why these journeys missed</h2>
          <div>
            {result.excluded.map((row) => (
              <button
                type="button"
                key={row.journey.id}
                onClick={() =>
                  openCalculation(row.journey.id, "door_to_door_time")
                }
              >
                <span>
                  {row.journey.operator} · {row.journey.service}
                </span>
                <strong>{row.reasons.join(" · ")}</strong>
              </button>
            ))}
          </div>
        </section>
      )}
      {result.ranked.length ? (
        <>
          <JourneyPlot
            rows={result.ranked}
            onExplain={(id) => openCalculation(id, "door_to_door_time")}
          />
          <section className="wl-ranked" id="results">
            <div className="wl-section-heading">
              <div>
                <p className="wl-kicker">Complete journeys</p>
                <h2>Your current order</h2>
              </div>
              <p>
                {Math.round(view.assumptions.reliability_weight * 100)}%
                reliability ·{" "}
                {Math.round((1 - view.assumptions.reliability_weight) * 100)}%
                speed, with walking distance as the tie-breaker.
              </p>
            </div>
            <div>
              {result.ranked.map((row) => (
                <JourneyCard
                  key={row.journey.id}
                  row={row}
                  state={state}
                  commit={commit}
                  openCalculation={openCalculation}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="wl-zero">
          <div>
            <p className="wl-kicker">Requirements preserved</p>
            <h2>No journey fits every choice</h2>
            <p>
              Nothing was silently relaxed. Apply one exact option if it works
              for you.
            </p>
          </div>
          <div>
            {relaxations.map((relaxation) => (
              <button
                type="button"
                key={relaxation.id}
                onClick={() =>
                  commit((current) => ({
                    ...current,
                    view: {
                      ...current.view!,
                      assumptions: {
                        ...current.view!.assumptions,
                        [relaxation.id]: relaxation.value,
                      },
                    },
                  }))
                }
              >
                <span>{relaxation.label}</span>
                <strong>
                  Show {relaxation.count} {plural(relaxation.count, "journey")}{" "}
                  <ArrowRight size={15} />
                </strong>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.compared.length >= 2 && (
        <JourneyComparison
          state={state}
          rows={selectedRows}
          close={() =>
            commit((current) => ({
              ...current,
              compared: [],
              comparisonRows: null,
            }))
          }
          remove={(id) =>
            commit((current) => ({
              ...current,
              compared: current.compared.filter((item) => item !== id),
            }))
          }
        />
      )}
      {state.compared.length === 1 && (
        <div className="wl-compare-bar">
          <span>1 journey selected</span>
          <strong>Choose one more to compare</strong>
        </div>
      )}
      {state.hidden.length > 0 && (
        <div className="wl-restore">
          <EyeOff size={15} />
          <span>
            {state.hidden.length} hidden{" "}
            {plural(state.hidden.length, "journey")}
          </span>
          <button
            type="button"
            onClick={() => commit((current) => ({ ...current, hidden: [] }))}
          >
            Restore all
          </button>
        </div>
      )}
      <footer className="wl-footer">
        <p>
          Schedules, operators, fares and performance bands are fictional
          deterministic demonstration data. Risk is based only on the displayed
          demo facts.
        </p>
        <button
          type="button"
          onClick={() =>
            commit((current) => ({
              ...current,
              view: null,
              calculation: null,
              compared: [],
            }))
          }
        >
          <RotateCcw size={15} />
          Return to ordinary results
        </button>
        <SiteLinks current="journeys" />
      </footer>
      <CalculationDialog
        state={state}
        close={() =>
          replaceTransient((current) => ({ ...current, calculation: null }))
        }
      />
    </main>
  );
}

export default function JourneysPage() {
  const [state, setState] = useState<AppState>(blankState);
  const [hydrated, setHydrated] = useState(false);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [building, setBuilding] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const stateRef = useRef(state);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const restored = restoreState(
            JSON.parse(stored) as Partial<AppState>,
          );
          stateRef.current = restored;
          setState(restored);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setHydrated(true);
    });
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const commit = useCallback((fn: (state: AppState) => AppState) => {
    const current = stateRef.current;
    const proposed = fn(current);
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

  const handlers = useMemo<JourneyWebMcpHandlers>(() => {
    const compact = (current: AppState) => {
      const config = current.view ?? defaultJourneyView;
      return evaluateJourneys(config, current.hidden).all.map((row) => ({
        journey_id: row.journey.id,
        operator: row.journey.operator,
        service: row.journey.service,
        mode: row.journey.mode,
        departure_terminal: row.journey.departureTerminal,
        arrival_terminal: row.journey.arrivalTerminal,
        departure_time: formatClock(row.journey.departureMinute),
        advertised_duration_minutes: row.journey.advertisedMinutes,
        total_door_to_door_minutes: row.totalMinutes,
        arrival_time: formatClock(row.arrivalMinute),
        arrival_slack_minutes: row.arrivalSlackMinutes,
        walking_km: row.walkingKm,
        disruption_risk_percent: row.riskPercent,
        fare_gbp: row.journey.fare,
        carbon_kg_co2e: row.journey.carbonKg,
        direct: row.journey.direct,
        connection_slack_minutes: row.journey.connectionSlackMinutes,
        punctuality_band: row.journey.punctualityBand,
        step_free: row.journey.stepFree,
        eligible: row.eligible,
        exclusion_reasons: row.reasons,
        saved: current.saved.includes(row.journey.id),
        hidden: current.hidden.includes(row.journey.id),
        rank: row.rank || null,
      }));
    };
    const readPage = async (
      _input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      abortIfNeeded(signal);
      const current = stateRef.current;
      return jsonSafe({
        ok: true,
        page: "wayline_journeys",
        fictional_demo_data: true,
        current_revision: current.revision,
        supported_assumptions: {
          origin: {
            values: Object.keys(journeyOrigins),
            labels: journeyOrigins,
          },
          destination: {
            values: Object.keys(journeyDestinations),
            labels: journeyDestinations,
          },
          checked_bag: { type: "boolean" },
          arrival_deadline_minutes: {
            unit: "minutes_after_midnight",
            minimum: 600,
            maximum: 1439,
            example: 1140,
          },
          minimum_connection_slack_minutes: {
            unit: "minutes",
            minimum: 0,
            maximum: 120,
            example: 20,
          },
          reliability_weight: { minimum: 0, maximum: 1, example: 0.67 },
        },
        supported_requirements: requirementIds,
        supported_metrics: metricIds,
        comparison_row_ids: comparisonRowIds,
        journey_view: current.view,
        locked_assumption_ids: current.locked,
        saved_journey_ids: current.saved,
        hidden_journey_ids: current.hidden,
        compared_journey_ids: current.compared,
        selected_comparison_row_ids: current.comparisonRows,
        open_calculation: current.calculation,
        journeys: compact(current),
      });
    };
    const createJourneyView = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (current.view && input.base_revision == null)
        return toolFailure(
          "VIEW_REQUIRES_REVISION",
          "A journey view already exists. Read it and include its current revision.",
          { current_revision: current.revision },
        );
      if (current.view && input.base_revision !== current.revision)
        return toolFailure(
          "STALE_VIEW",
          "The page changed since it was read.",
          { current_revision: current.revision },
        );
      const raw = input.assumptions;
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return toolFailure(
          "MISSING_INPUT",
          "Provide the complete supported assumptions object.",
        );
      const assumptions = raw as Record<string, unknown>;
      const proposed: JourneyView = {
        title: "",
        assumptions: {
          origin: String(assumptions.origin) as JourneyOrigin,
          destination: String(assumptions.destination) as JourneyDestination,
          checked_bag: assumptions.checked_bag === true,
          arrival_deadline_minutes: Number(
            assumptions.arrival_deadline_minutes,
          ),
          minimum_connection_slack_minutes: Number(
            assumptions.minimum_connection_slack_minutes,
          ),
          reliability_weight: Number(assumptions.reliability_weight),
        },
        requirements: Array.isArray(input.requirements)
          ? (input.requirements as JourneyRequirementId[])
          : [],
        visibleMetricIds: Array.isArray(input.visible_metric_ids)
          ? (input.visible_metric_ids as JourneyMetricId[])
          : [],
        primarySort:
          input.primary_sort &&
          typeof input.primary_sort === "object" &&
          !Array.isArray(input.primary_sort)
            ? {
                metricId: String(
                  (input.primary_sort as Record<string, unknown>).metric_id,
                ) as JourneyMetricId,
                direction:
                  (input.primary_sort as Record<string, unknown>).direction ===
                  "desc"
                    ? "desc"
                    : "asc",
              }
            : { metricId: "door_to_door_time", direction: "asc" },
      };
      if (current.view)
        for (const id of current.locked)
          proposed.assumptions[id] = current.view.assumptions[id] as never;
      proposed.title = journeyViewTitle(proposed.assumptions);
      const invalid = validateView(proposed);
      if (invalid) return toolFailure("INVALID_VIEW", invalid);
      abortIfNeeded(signal);
      setBuilding(true);
      await new Promise((resolve) => setTimeout(resolve, 180));
      abortIfNeeded(signal);
      if (stateRef.current.revision !== current.revision) {
        setBuilding(false);
        return toolFailure(
          "STALE_VIEW",
          "The page changed while the view was being prepared.",
          { current_revision: stateRef.current.revision },
        );
      }
      const next = commit((present) => ({
        ...present,
        view: proposed,
        calculation: null,
      }));
      setBuilding(false);
      history.replaceState({ journey: false }, "");
      history.pushState({ journey: true }, "");
      await delayPaint();
      document.getElementById("wl-decision-heading")?.focus();
      const evaluated = evaluateJourneys(proposed, next.hidden);
      return jsonSafe({
        ok: true,
        revision: next.revision,
        eligible_count: evaluated.ranked.length,
        excluded_count: evaluated.excluded.length,
        ranked_journey_ids: evaluated.ranked.map((row) => row.journey.id),
        journeys: compact(next),
      });
    };
    const updateJourneyView = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.view)
        return toolFailure(
          "MISSING_VIEW",
          "Create a journey view before updating it.",
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          "STALE_VIEW",
          "The page changed since it was read.",
          { current_revision: current.revision },
        );
      if (
        !Array.isArray(input.operations) ||
        !input.operations.length ||
        input.operations.length > 12
      )
        return toolFailure(
          "INVALID_OPERATIONS",
          "Provide one to twelve supported operations.",
        );
      const draft = cloneView(current.view);
      const changed: string[] = [];
      const lockMap: Partial<Record<string, ControlId>> = {
        set_origin: "origin",
        set_destination: "destination",
        set_checked_bag: "checked_bag",
        set_arrival_deadline: "arrival_deadline_minutes",
        set_minimum_connection_slack: "minimum_connection_slack_minutes",
        set_reliability_weight: "reliability_weight",
      };
      for (const item of input.operations) {
        if (!item || typeof item !== "object" || Array.isArray(item))
          return toolFailure(
            "INVALID_OPERATIONS",
            "Each operation must be an object.",
          );
        const operation = item as Record<string, unknown>,
          type = String(operation.operation);
        const numericValue = Number(operation.value);
        const validPayload =
          (type === "set_origin" &&
            typeof operation.value === "string" &&
            operation.value in journeyOrigins) ||
          (type === "set_destination" &&
            typeof operation.value === "string" &&
            operation.value in journeyDestinations) ||
          (type === "set_checked_bag" &&
            typeof operation.value === "boolean") ||
          (type === "set_arrival_deadline" &&
            Number.isInteger(numericValue) &&
            numericValue >= 600 &&
            numericValue <= 1439) ||
          (type === "set_minimum_connection_slack" &&
            Number.isInteger(numericValue) &&
            numericValue >= 0 &&
            numericValue <= 120) ||
          (type === "set_reliability_weight" &&
            typeof operation.value === "number" &&
            Number.isFinite(numericValue) &&
            numericValue >= 0 &&
            numericValue <= 1) ||
          ((type === "add_requirement" || type === "remove_requirement") &&
            typeof operation.requirement_id === "string" &&
            requirementIds.includes(
              operation.requirement_id as JourneyRequirementId,
            )) ||
          ((type === "show_metric" || type === "hide_metric") &&
            typeof operation.metric_id === "string" &&
            metricIds.includes(operation.metric_id as JourneyMetricId)) ||
          (type === "set_primary_sort" &&
            typeof operation.metric_id === "string" &&
            metricIds.includes(operation.metric_id as JourneyMetricId) &&
            (operation.direction === "asc" || operation.direction === "desc"));
        if (!validPayload)
          return toolFailure(
            "INVALID_OPERATION",
            `Operation “${type}” is missing a supported, correctly typed value.`,
          );
        const control = lockMap[type];
        if (control && current.locked.includes(control))
          return toolFailure(
            "LOCKED_ASSUMPTION",
            `${control} is locked by the traveller.`,
            { field: control, current_revision: current.revision },
          );
        if (type === "set_origin")
          draft.assumptions.origin = String(operation.value) as JourneyOrigin;
        else if (type === "set_destination")
          draft.assumptions.destination = String(
            operation.value,
          ) as JourneyDestination;
        else if (type === "set_checked_bag")
          draft.assumptions.checked_bag = operation.value === true;
        else if (type === "set_arrival_deadline")
          draft.assumptions.arrival_deadline_minutes = Number(operation.value);
        else if (type === "set_minimum_connection_slack")
          draft.assumptions.minimum_connection_slack_minutes = Number(
            operation.value,
          );
        else if (type === "set_reliability_weight")
          draft.assumptions.reliability_weight = Number(operation.value);
        else if (type === "add_requirement") {
          const id = String(operation.requirement_id) as JourneyRequirementId;
          draft.requirements = [...new Set([...draft.requirements, id])];
        } else if (type === "remove_requirement") {
          const id = String(operation.requirement_id) as JourneyRequirementId;
          draft.requirements = draft.requirements.filter(
            (itemId) => itemId !== id,
          );
        } else if (type === "show_metric") {
          const id = String(operation.metric_id) as JourneyMetricId;
          draft.visibleMetricIds = [
            ...new Set([...draft.visibleMetricIds, id]),
          ];
        } else if (type === "hide_metric") {
          const id = String(operation.metric_id) as JourneyMetricId;
          draft.visibleMetricIds = draft.visibleMetricIds.filter(
            (itemId) => itemId !== id,
          );
        } else if (type === "set_primary_sort")
          draft.primarySort = {
            metricId: String(operation.metric_id) as JourneyMetricId,
            direction: operation.direction === "desc" ? "desc" : "asc",
          };
        else
          return toolFailure(
            "INVALID_OPERATION",
            `Unsupported operation “${String(type)}”.`,
          );
        changed.push(control ?? type);
      }
      draft.title = journeyViewTitle(draft.assumptions);
      const invalid = validateView(draft);
      if (invalid) return toolFailure("INVALID_VIEW", invalid);
      abortIfNeeded(signal);
      const next = commit((present) => ({ ...present, view: draft }));
      await delayPaint();
      const evaluated = evaluateJourneys(draft, next.hidden);
      return jsonSafe({
        ok: true,
        revision: next.revision,
        changed_controls: changed,
        eligible_count: evaluated.ranked.length,
        excluded_count: evaluated.excluded.length,
        ranked_journey_ids: evaluated.ranked.map((row) => row.journey.id),
        journeys: compact(next),
      });
    };
    const compareJourneys = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.view)
        return toolFailure(
          "MISSING_VIEW",
          "Create a journey view before comparing.",
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          "STALE_VIEW",
          "The page changed since it was read.",
          { current_revision: current.revision },
        );
      const ids = input.journey_ids;
      if (
        !Array.isArray(ids) ||
        ids.length < 2 ||
        ids.length > 4 ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => typeof id !== "string" || !journeyById.has(id))
      )
        return toolFailure(
          "INVALID_COMPARISON",
          "Choose two to four unique journey IDs.",
          { valid_ids: journeys.map((journey) => journey.id) },
        );
      const hidden = ids.find((id) => current.hidden.includes(String(id)));
      if (hidden)
        return toolFailure(
          "HIDDEN_JOURNEY",
          `${hidden} was hidden by the traveller.`,
        );
      const rows = input.row_ids;
      if (
        rows !== undefined &&
        (!Array.isArray(rows) ||
          !rows.length ||
          rows.some(
            (id) => !comparisonRowIds.includes(String(id) as ComparisonRowId),
          ))
      )
        return toolFailure(
          "INVALID_COMPARISON",
          "Use supported comparison row IDs.",
          { valid_ids: comparisonRowIds },
        );
      abortIfNeeded(signal);
      const next = commit((present) => ({
        ...present,
        compared: ids as string[],
        comparisonRows: rows ? (rows as ComparisonRowId[]) : null,
      }));
      await delayPaint();
      return {
        ok: true,
        revision: next.revision,
        compared_journey_ids: ids,
        rendered_row_ids: rows ?? comparisonRowIds.slice(0, 8),
      };
    };
    const showJourneyCalculation = async (
      input: Record<string, unknown>,
      signal?: AbortSignal,
    ) => {
      const current = stateRef.current;
      if (!current.view)
        return toolFailure(
          "MISSING_VIEW",
          "Create a journey view before opening a calculation.",
        );
      if (input.base_revision !== current.revision)
        return toolFailure(
          "STALE_VIEW",
          "The page changed since it was read.",
          { current_revision: current.revision },
        );
      const journeyId = String(input.journey_id),
        metricId = String(input.metric_id);
      const journey = journeyById.get(journeyId);
      if (!journey)
        return toolFailure(
          "UNKNOWN_JOURNEY",
          `Unknown journey “${journeyId}”.`,
        );
      if (
        !journeyCalculationMetricIds.includes(
          metricId as JourneyCalculationMetricId,
        )
      )
        return toolFailure(
          "UNSUPPORTED_METRIC",
          `Choose one of: ${journeyCalculationMetricIds.join(", ")}.`,
        );
      abortIfNeeded(signal);
      replaceTransient((present) => ({
        ...present,
        calculation: {
          journeyId,
          metricId: metricId as JourneyCalculationMetricId,
        },
      }));
      await delayPaint();
      return jsonSafe({
        ok: true,
        revision: current.revision,
        breakdown: explainJourney(
          journey,
          current.view,
          metricId as JourneyCalculationMetricId,
        ),
      });
    };
    return {
      readPage,
      createJourneyView,
      updateJourneyView,
      compareJourneys,
      showJourneyCalculation,
    };
  }, [commit, replaceTransient]);

  useEffect(() => {
    if (!hydrated) return;
    const registration = registerJourneyTools(handlers);
    queueMicrotask(() => setMcpAvailable(registration.available));
    return registration.abort;
  }, [handlers, hydrated]);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (event.state?.journey === false && stateRef.current.view) {
        replaceTransient((current) => ({
          ...current,
          view: null,
          calculation: null,
        }));
      } else if (event.state?.journey === true && !stateRef.current.view) {
        const prior = [...stateRef.current.past]
          .reverse()
          .find((entry) => entry.view)?.view;
        if (prior) replaceTransient((current) => ({ ...current, view: prior }));
      }
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [replaceTransient]);

  return (
    <div className="wayline-app">
      <WaylineHeader mcpAvailable={mcpAvailable} />
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      {building && (
        <output className="wl-building">
          <span />
          Building your door-to-door view…
        </output>
      )}
      {state.view ? (
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

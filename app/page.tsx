'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, CircleHelp, EyeOff,
  Heart, Info, Lock, LockOpen, PackageCheck, RotateCcw, Search, ShoppingBag,
  SlidersHorizontal, Sparkles, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { catalog, productById, type Product } from '@/lib/catalog';
import {
  assumptionMeta, defaultDecision, evaluateCatalog, evaluateProduct, explainMetric,
  findNearestRelaxations, metricMeta, type AssumptionId, type Assumptions,
  type DecisionConfig, type DerivedMetricId, type Evaluation, type MetricId,
  type NumericAssumptionId, type RequirementId,
} from '@/lib/decision';
import { registerDecisionTools, type WebMcpHandlers } from '@/lib/webmcp';

const STORAGE_KEY = 'hearth-home-decision-v1';
const metricIds = Object.keys(metricMeta) as MetricId[];
const assumptionIds = Object.keys(assumptionMeta) as AssumptionId[];
const requirementIds: RequirementId[] = ['in_stock', 'fits_opening', 'delivery_within_days', 'minimum_capacity_kg', 'maximum_purchase_price', 'machine_type'];
const comparisonRowIds = ['eligible', 'ownership_cost', 'annual_running_cost', 'running_cost_per_cycle', 'physical_clearance', 'delivery_slack', 'capacity', 'energy_per_100', 'water_per_cycle', 'spin_noise', 'spin_speed', 'cycle_duration', 'machine_type', 'installed_dimensions', 'warranty'];

type CalculationState = { productId: string; metricId: DerivedMetricId } | null;
type Snapshot = {
  decision: DecisionConfig | null;
  lockedIds: AssumptionId[];
  shortlisted: string[];
  hidden: string[];
  compared: string[];
  viewMode: 'cards' | 'table' | 'plot';
  calculation: CalculationState;
  showExcluded: boolean;
};
type AppState = Snapshot & { revision: number; past: Snapshot[]; future: Snapshot[] };

const blankState: AppState = {
  decision: null, revision: 0, lockedIds: [], shortlisted: [], hidden: [], compared: [],
  viewMode: 'cards', calculation: null, showExcluded: false, past: [], future: [],
};
const snapshotOf = (state: AppState): Snapshot => ({
  decision: state.decision, lockedIds: state.lockedIds, shortlisted: state.shortlisted,
  hidden: state.hidden, compared: state.compared, viewMode: state.viewMode,
  calculation: state.calculation, showExcluded: state.showExcluded,
});
const cloneDecision = (view: DecisionConfig): DecisionConfig => JSON.parse(JSON.stringify(view));
const jsonSafe = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const delayPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const abortIfNeeded = (signal?: AbortSignal) => signal?.throwIfAborted();

function highlightAgentChanges(changed: string[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selectors = new Set<string>();
  for (const id of changed) {
    if (assumptionIds.includes(id as AssumptionId)) selectors.add(`[data-assumption="${id}"]`);
    else if (id === 'title') selectors.add('.hero-copy');
    else if (id === 'tradeoff') selectors.add('.tradeoff-control');
    else if (id === 'plot') selectors.add('.plot-panel');
    else selectors.add('.results-section');
  }
  for (const selector of selectors) document.querySelector<HTMLElement>(selector)?.animate(
    [{ boxShadow: '0 0 0 3px rgba(39,94,254,.24)' }, { boxShadow: '0 0 0 0 rgba(39,94,254,0)' }],
    { duration: 1200, easing: 'ease-out' },
  );
}

function toolFailure(code: string, message: string, extra: Record<string, unknown> = {}) {
  return { ok: false, error: { code, message, ...extra } };
}

const stringInput = (value: unknown) => typeof value === 'string' ? value : '';

function validateAssumptions(assumptions: Assumptions) {
  for (const [rawId, rawValue] of Object.entries(assumptions)) {
    const id = rawId as AssumptionId;
    const meta = assumptionMeta[id];
    if (!meta) return toolFailure('UNSUPPORTED_ASSUMPTION', `Unsupported assumption “${rawId}”.`, { field: rawId, valid_ids: assumptionIds });
    if (id === 'machine_type') {
      if (!['freestanding', 'integrated'].includes(String(rawValue))) return toolFailure('UNSUPPORTED_ASSUMPTION', 'Machine type must be freestanding or integrated.', { field: id, valid_values: ['freestanding', 'integrated'] });
      continue;
    }
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < meta.min || rawValue > meta.max) {
      return toolFailure('UNSUPPORTED_ASSUMPTION', `${meta.label} must be between ${meta.min} and ${meta.max} ${meta.displayUnit}.`, { field: id, storage_unit: meta.storageUnit, display_unit: meta.displayUnit, bounds: { minimum: meta.min, maximum: meta.max }, example: meta.example });
    }
  }
  return null;
}

function validateConfig(config: DecisionConfig) {
  if (!config.title.trim() || config.title.length > 70) return toolFailure('MISSING_INPUT', 'Title must be between 1 and 70 characters.', { field: 'title' });
  const badAssumption = validateAssumptions(config.assumptions);
  if (badAssumption) return badAssumption;
  if (!config.visibleMetricIds.length || config.visibleMetricIds.length > 6 || config.visibleMetricIds.some((id) => !metricIds.includes(id))) return toolFailure('UNSUPPORTED_METRIC', 'Choose between one and six supported metrics.', { valid_ids: metricIds });
  if (!metricIds.includes(config.primarySort.metricId)) return toolFailure('UNSUPPORTED_METRIC', `Unsupported sort metric “${config.primarySort.metricId}”.`, { valid_ids: metricIds });
  if (config.tradeoff && (config.tradeoff.firstMetricId === config.tradeoff.secondMetricId || !metricIds.includes(config.tradeoff.firstMetricId) || !metricIds.includes(config.tradeoff.secondMetricId) || config.tradeoff.secondMetricWeight < 0 || config.tradeoff.secondMetricWeight > 1)) return toolFailure('UNSUPPORTED_METRIC', 'A tradeoff needs two different supported metrics and a weight from 0 to 1.', { valid_ids: metricIds });
  if (!metricIds.includes(config.plot.xMetricId) || !metricIds.includes(config.plot.yMetricId) || config.plot.xMetricId === config.plot.yMetricId) return toolFailure('UNSUPPORTED_METRIC', 'Plot axes must be two different supported numeric metrics.', { valid_ids: metricIds });
  if (config.requirements.length > 8 || config.requirements.some((r) => !requirementIds.includes(r.id))) return toolFailure('INVALID_REQUIREMENT', 'One or more requirements are not supported.', { valid_ids: requirementIds });
  if (new Set(config.requirements.map((r) => r.id)).size !== config.requirements.length) return toolFailure('INVALID_REQUIREMENT', 'Each hard requirement may appear only once.', { valid_ids: requirementIds });
  const linkedAssumption: Partial<Record<RequirementId, AssumptionId>> = { delivery_within_days: 'delivery_within_days', minimum_capacity_kg: 'minimum_capacity_kg', maximum_purchase_price: 'maximum_purchase_price', machine_type: 'machine_type' };
  for (const requirement of config.requirements) {
    const linked = linkedAssumption[requirement.id];
    if (linked && requirement.value != null && requirement.value !== config.assumptions[linked as keyof Assumptions]) return toolFailure('INVALID_REQUIREMENT', `${requirement.id} must use the same value as ${linked}.`, { field: requirement.id });
  }
  const needs = new Set<AssumptionId>();
  for (const metric of [...config.visibleMetricIds, config.primarySort.metricId, config.plot.xMetricId, config.plot.yMetricId]) metricMeta[metric].requires.forEach((id) => needs.add(id));
  if (config.tradeoff) [config.tradeoff.firstMetricId, config.tradeoff.secondMetricId].forEach((metric) => metricMeta[metric].requires.forEach((id) => needs.add(id)));
  if (config.requirements.some((r) => r.id === 'fits_opening')) ['opening_width_cm', 'opening_depth_cm', 'opening_height_cm'].forEach((id) => needs.add(id as AssumptionId));
  if (config.requirements.some((r) => r.id === 'delivery_within_days')) needs.add('delivery_within_days');
  if (config.requirements.some((r) => r.id === 'minimum_capacity_kg')) needs.add('minimum_capacity_kg');
  if (config.requirements.some((r) => r.id === 'maximum_purchase_price')) needs.add('maximum_purchase_price');
  if (config.requirements.some((r) => r.id === 'machine_type')) needs.add('machine_type');
  const missing = [...needs].filter((id) => config.assumptions[id as keyof Assumptions] == null);
  if (missing.length) return toolFailure('MISSING_INPUT', `Missing assumptions required by this view: ${missing.join(', ')}.`, { missing_assumption_ids: missing });
  return null;
}

function deliveryDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function metricValue(metric: MetricId, value: number, precise = false) {
  if (['purchase_price', 'ownership_cost', 'energy_cost', 'water_cost', 'annual_running_cost'].includes(metric)) return `£${precise ? value.toFixed(2) : Math.round(value).toLocaleString('en-GB')}`;
  if (metric === 'running_cost_per_cycle') return `${(value * 100).toFixed(1)}p`;
  if (metric === 'spin_noise_db') return `${value.toFixed(0)} dB`;
  if (metric === 'capacity_kg') return `${value.toFixed(0)} kg`;
  if (metric === 'narrowest_clearance_cm') return `${value.toFixed(1)} cm`;
  if (metric === 'delivery_slack_days') return `${value.toFixed(0)} day${value === 1 ? '' : 's'}`;
  if (metric === 'annual_energy_kwh') return `${Math.round(value).toLocaleString('en-GB')} kWh`;
  if (metric === 'annual_water_litres') return `${Math.round(value).toLocaleString('en-GB')} L`;
  return String(value);
}

function compactRows(state: AppState) {
  if (!state.decision) return [];
  const result = evaluateCatalog(state.decision, state.hidden);
  return result.ranked.slice(0, 12).map((row) => ({
    product_id: row.product.id, model: `${row.product.brand} ${row.product.model}`, rank: row.rank,
    purchase_price_gbp: row.product.price,
    metrics: Object.fromEntries(state.decision!.visibleMetricIds.map((id) => [id, row.metrics[id]])),
    eligible: row.eligible, shortlisted: state.shortlisted.includes(row.product.id), strong_tradeoff: Boolean(row.strongTradeoff),
  }));
}

function ProductImage({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <div className="product-image-wrap">
      <Image src={product.image} alt={`${product.brand} ${product.model} front-loading washing machine`} fill sizes="(max-width: 520px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={eager} style={{ objectPosition: product.imagePosition }} />
      {product.previousPrice && <span className="price-drop">Price drop</span>}
    </div>
  );
}

function StandardCard({ product, onView }: { product: Product; onView: (p: Product) => void }) {
  return (
    <article className="product-card standard-card">
      <ProductImage product={product} />
      <div className="card-body">
        <p className="eyebrow">{product.brand}</p>
        <h2>{product.model}</h2>
        <div className="price-line"><strong>£{product.price}</strong>{product.previousPrice && <s>£{product.previousPrice}</s>}</div>
        <div className="standard-facts"><span>{product.capacityKg} kg</span><span>Energy {product.energyClass}</span><span>{product.inStock ? deliveryDate(product.deliveryDays) : 'Out of stock'}</span></div>
        <Button className="full-button" onClick={() => onView(product)}>View product</Button>
      </div>
    </article>
  );
}

function Header({ mcpAvailable }: { mcpAvailable: boolean }) {
  return (
    <>
      <div className="service-strip"><div><span>Free recycling on selected appliances</span><span>Rated Excellent for delivery</span></div></div>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Hearth and Home">Hearth <i>&amp;</i> Home</a>
          <label className="search-box"><Search size={18} aria-hidden="true"/><span className="sr-only">Search products</span><input placeholder="Search appliances" /></label>
          <button className="basket" aria-label="Basket, 0 items"><ShoppingBag size={20}/> <span>Basket</span><b>0</b></button>
        </div>
      </header>
      {mcpAvailable && <div className="assistant-ribbon"><span><Sparkles size={14}/> Works with your browser assistant</span></div>}
    </>
  );
}

function ProductDetail({ product, open, onOpenChange }: { product: Product | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!product) return null;
  const rows = [
    ['Machine type', product.type], ['Capacity', `${product.capacityKg} kg`], ['Energy class', product.energyClass],
    ['Energy / 100 Eco cycles', `${product.energyKwhPer100} kWh`], ['Water / Eco cycle', `${product.waterLitresPerCycle} litres`],
    ['Spin noise', `${product.noiseDb} dB · class ${product.noiseClass}`], ['Maximum spin', `${product.spinSpeed} rpm`],
    ['Eco 40–60 duration', `${Math.floor(product.cycleMinutes / 60)}h ${product.cycleMinutes % 60}m`],
    ['Required installed size', `${product.widthCm} × ${product.installedDepthCm} × ${product.heightCm} cm W×D×H`],
    ['Rear clearance included', `${product.rearClearanceCm} cm`], ['Warranty', `${product.warrantyYears} years`],
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="detail-sheet">
        <SheetHeader><p className="eyebrow">{product.brand}</p><SheetTitle className="sheet-title">{product.model}</SheetTitle><SheetDescription>Complete retailer specification</SheetDescription></SheetHeader>
        <ProductImage product={product} eager />
        <div className="sheet-price">£{product.price}</div>
        <dl className="spec-list">{rows.map(([label, val]) => <div key={label}><dt>{label}</dt><dd>{val}</dd></div>)}</dl>
      </SheetContent>
    </Sheet>
  );
}

function StandardPage({ onView }: { onView: (p: Product) => void }) {
  const [brand, setBrand] = useState('all');
  const [type, setType] = useState('all');
  const [capacity, setCapacity] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sort, setSort] = useState('relevance');
  const brands = [...new Set(catalog.map((p) => p.brand))];
  const filtered = useMemo(() => catalog.filter((p) => (brand === 'all' || p.brand === brand) && (type === 'all' || p.type === type) && p.capacityKg >= capacity && p.price <= maxPrice).sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : a.id.localeCompare(b.id)), [brand, type, capacity, maxPrice, sort]);
  const clear = () => { setBrand('all'); setType('all'); setCapacity(0); setMaxPrice(1000); };
  return (
    <main id="top" className="page-shell standard-page">
      <div className="breadcrumbs">Home <span>/</span> Laundry <span>/</span> Washing machines</div>
      <div className="category-heading"><div><p className="eyebrow blue">Laundry</p><h1>Washing machines</h1><p>Thoughtfully selected machines, ready for real homes.</p></div><div className="count-medallion"><strong>{filtered.length}</strong><span>machines</span></div></div>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Product filters">
          <div className="filter-title"><SlidersHorizontal size={17}/><strong>Filter by</strong><button onClick={clear}>Clear</button></div>
          <label>Price up to <strong>£{maxPrice}</strong><input type="range" min="300" max="1000" step="25" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}/></label>
          <label>Brand<select value={brand} onChange={(e) => setBrand(e.target.value)}><option value="all">All brands</option>{brands.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label>Machine type<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option><option value="freestanding">Freestanding</option><option value="integrated">Integrated</option></select></label>
          <label>Capacity<select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}><option value="0">Any capacity</option><option value="8">8 kg or more</option><option value="9">9 kg or more</option><option value="10">10 kg or more</option></select></label>
        </aside>
        <section aria-label="Washing machines" className="catalog-results">
          <div className="result-toolbar"><p><strong>{filtered.length} results</strong></p><label>Sort by <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="relevance">Relevance</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div>
          {filtered.length ? <div className="standard-grid">{filtered.map((p) => <StandardCard key={p.id} product={p} onView={onView}/>)}</div> : <div className="empty-standard"><h2>No machines match these filters</h2><p>Try raising your price limit or clearing a filter.</p><Button onClick={clear}>Clear all filters</Button></div>}
        </section>
      </div>
      <footer className="catalog-credit">Product photograph by A65 Design, used under the Unsplash License. Product names and specifications are fictional for this demonstration.</footer>
    </main>
  );
}

type AssumptionControlProps = { id: NumericAssumptionId; config: DecisionConfig; locked: boolean; onChange: (id: NumericAssumptionId, value: number) => void; onToggleLock: (id: AssumptionId) => void };
function AssumptionControl({ id, config, locked, onChange, onToggleLock }: AssumptionControlProps) {
  const meta = assumptionMeta[id];
  const value = config.assumptions[id] ?? meta.example;
  return (
    <label className={`assumption-control ${locked ? 'is-locked' : ''}`} data-assumption={id}>
      <span>{meta.label}<button type="button" onClick={() => onToggleLock(id)} aria-label={`${locked ? 'Unlock' : 'Lock'} ${meta.label}`} title={`${locked ? 'Unlock' : 'Lock'} this assumption`}>{locked ? <Lock size={14}/> : <LockOpen size={14}/>}</button></span>
      <div><input type="number" min={meta.min} max={meta.max} step={meta.step} value={Number(value)} onChange={(e) => { const next = Number(e.target.value); if (Number.isFinite(next) && next >= meta.min && next <= meta.max) onChange(id, next); }}/><em>{meta.displayUnit}</em></div>
    </label>
  );
}

function DecisionCard({ row, config, state, onCalculate, onShortlist, onCompare, onHide, onView }: { row: Evaluation; config: DecisionConfig; state: AppState; onCalculate: (productId: string, metric: DerivedMetricId) => void; onShortlist: (id: string) => void; onCompare: (id: string) => void; onHide: (id: string) => void; onView: (p: Product) => void }) {
  const shortlisted = state.shortlisted.includes(row.product.id);
  const compared = state.compared.includes(row.product.id);
  const derived = config.visibleMetricIds.filter((id) => !['purchase_price', 'spin_noise_db', 'capacity_kg'].includes(id));
  const main = derived[0] ?? 'ownership_cost';
  return (
    <article className={`decision-card ${shortlisted ? 'shortlisted' : ''}`} id={`product-${row.product.id}`}>
      <div className="rank-flag">{row.rank === 1 ? 'First for your current balance' : `#${row.rank} for this balance`}</div>
      <ProductImage product={row.product}/>
      <div className="card-body">
        <div className="model-row"><div><p className="eyebrow">{row.product.brand}</p><h3>{row.product.model}</h3></div><div className="purchase-price"><span>Today</span><strong>£{row.product.price}</strong></div></div>
        <button className="main-metric" onClick={() => onCalculate(row.product.id, main as DerivedMetricId)}><span>Estimated {metricMeta[main].label.toLowerCase()}</span><strong>{metricValue(main, row.metrics[main])}</strong><CircleHelp size={16}/></button>
        <div className="decision-facts">
          {config.visibleMetricIds.slice(1).map((metric) => {
            const clickable = !['purchase_price', 'spin_noise_db', 'capacity_kg'].includes(metric);
            const content = <><span>{metricMeta[metric].label}</span><strong>{metricValue(metric, row.metrics[metric])}</strong></>;
            return clickable ? <button key={metric} onClick={() => onCalculate(row.product.id, metric as DerivedMetricId)}>{content}</button> : <div key={metric}>{content}</div>;
          })}
        </div>
        <p className="fit-line"><Check size={15}/><span><strong>Fits</strong> · {row.metrics.narrowest_clearance_cm.toFixed(1)} cm at the tightest point</span></p>
        <p className="capacity-line">{row.product.capacityKg} kg capacity · Energy class {row.product.energyClass}</p>
        <p className="delivery-line"><PackageCheck size={15}/>{deliveryDate(row.product.deliveryDays)} · {Math.max(0, row.metrics.delivery_slack_days)} days before deadline</p>
        <div className="card-actions">
          <button className={shortlisted ? 'active' : ''} onClick={() => onShortlist(row.product.id)}><Heart size={16} fill={shortlisted ? 'currentColor' : 'none'}/>{shortlisted ? 'Saved' : 'Shortlist'}</button>
          <button className={compared ? 'active' : ''} onClick={() => onCompare(row.product.id)} disabled={!compared && state.compared.length >= 4}><BadgeCheck size={16}/>{compared ? 'Selected' : 'Compare'}</button>
          <button onClick={() => onHide(row.product.id)}><EyeOff size={16}/>Hide</button>
          <button onClick={() => onView(row.product)}>View product</button>
        </div>
      </div>
    </article>
  );
}

function TradeoffPlot({ rows, config, state, onSelect, onCompare }: { rows: Evaluation[]; config: DecisionConfig; state: AppState; onSelect: (id: string) => void; onCompare: (id: string) => void }) {
  const xId = config.plot.xMetricId, yId = config.plot.yMetricId;
  const xs = rows.map((r) => r.metrics[xId]), ys = rows.map((r) => r.metrics[yId]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xScale = (v: number) => 72 + ((v - xMin) / Math.max(xMax - xMin, 1)) * 680;
  const yScale = (v: number) => 316 - ((v - yMin) / Math.max(yMax - yMin, 1)) * 260;
  const strong = rows.filter((r) => r.strongTradeoff).sort((a, b) => a.metrics[xId] - b.metrics[xId]);
  return (
    <div className="plot-panel">
      <div className="plot-heading"><div><p className="eyebrow blue">Strong tradeoffs</p><h3>{metricMeta[xId].label} against {metricMeta[yId].label.toLowerCase()}</h3></div><p>No other visible machine is better on both current axes.</p></div>
      <svg className="tradeoff-svg" viewBox="0 0 820 380" aria-labelledby="tradeoff-plot-title">
        <title id="tradeoff-plot-title">{metricMeta[xId].label} against {metricMeta[yId].label} for {rows.length} machines</title>
        <line x1="72" y1="326" x2="770" y2="326" className="axis"/><line x1="62" y1="48" x2="62" y2="326" className="axis"/>
        {[0, .25, .5, .75, 1].map((tick) => <g key={`x${tick}`}><line x1={72 + tick * 680} y1="326" x2={72 + tick * 680} y2="332" className="axis"/><text x={72 + tick * 680} y="350" textAnchor="middle">{metricValue(xId, xMin + tick * (xMax - xMin))}</text></g>)}
        {[0, .5, 1].map((tick) => <g key={`y${tick}`}><line x1="56" y1={316 - tick * 260} x2="62" y2={316 - tick * 260} className="axis"/><text x="50" y={320 - tick * 260} textAnchor="end">{metricValue(yId, yMin + tick * (yMax - yMin))}</text></g>)}
        {strong.length > 1 && <polyline className="frontier" points={strong.map((r) => `${xScale(r.metrics[xId])},${yScale(r.metrics[yId])}`).join(' ')}/>} 
        {rows.map((row) => {
          const saved = state.shortlisted.includes(row.product.id), selected = state.compared.includes(row.product.id);
          return <a key={row.product.id} href={`#product-${row.product.id}`} className={`plot-point ${row.strongTradeoff ? 'strong' : ''} ${saved ? 'saved' : ''} ${selected ? 'selected' : ''}`} aria-label={`${row.product.brand} ${row.product.model}, ${metricMeta[xId].label} ${metricValue(xId, row.metrics[xId])}, ${metricMeta[yId].label} ${metricValue(yId, row.metrics[yId])}, eight-year cost ${metricValue('ownership_cost', row.metrics.ownership_cost)}`} onClick={(e) => { e.preventDefault(); if (e.shiftKey) onCompare(row.product.id); else onSelect(row.product.id); }} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); onSelect(row.product.id); } }}><title>{row.product.brand} {row.product.model} · {metricValue(xId, row.metrics[xId])} · {metricValue(yId, row.metrics[yId])}</title><circle cx={xScale(row.metrics[xId])} cy={yScale(row.metrics[yId])} r={config.plot.sizeMetricId ? 7 + row.metrics[config.plot.sizeMetricId] / 2 : 10}/>{(saved || row.strongTradeoff) && <text x={xScale(row.metrics[xId])} y={yScale(row.metrics[yId]) - 16} textAnchor="middle">{row.product.model}</text>}</a>;
        })}
        <text className="axis-title" x="420" y="376" textAnchor="middle">{metricMeta[xId].label} · {metricMeta[xId].unit} · {metricMeta[xId].direction === 'asc' ? 'lower is better' : 'higher is better'}</text>
        <text className="axis-title" transform="translate(15 190) rotate(-90)" textAnchor="middle">{metricMeta[yId].label} · {metricMeta[yId].unit} · {metricMeta[yId].direction === 'asc' ? 'lower is better' : 'higher is better'}</text>
      </svg>
      <details className="accessible-data"><summary>View this map as a table</summary><div className="table-scroll"><table><thead><tr><th>Machine</th><th>{metricMeta[xId].label}</th><th>{metricMeta[yId].label}</th><th>8-year cost</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.product.id}><th>{row.product.brand} {row.product.model}{row.strongTradeoff ? ' · Strong tradeoff' : ''}</th><td>{metricValue(xId, row.metrics[xId])}</td><td>{metricValue(yId, row.metrics[yId])}</td><td>{metricValue('ownership_cost', row.metrics.ownership_cost)}</td><td><button onClick={() => onCompare(row.product.id)}>Add to comparison</button></td></tr>)}</tbody></table></div></details>
    </div>
  );
}

function Comparison({ state, rows, onRemove, onClose }: { state: AppState; rows: Evaluation[]; onRemove: (id: string) => void; onClose: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const compared = state.compared.map((id) => rows.find((row) => row.product.id === id)).filter(Boolean) as Evaluation[];
  if (compared.length < 2) return null;
  const data = [
    ['Eligible now', (r: Evaluation) => r.eligible ? 'Yes' : r.reasons.join(', ')],
    ['Estimated ownership cost', (r: Evaluation) => metricValue('ownership_cost', r.metrics.ownership_cost)],
    ['Annual running cost', (r: Evaluation) => metricValue('annual_running_cost', r.metrics.annual_running_cost)],
    ['Running cost per wash', (r: Evaluation) => metricValue('running_cost_per_cycle', r.metrics.running_cost_per_cycle)],
    ['Physical clearance', (r: Evaluation) => `${r.clearances.width.toFixed(1)} / ${r.clearances.depth.toFixed(1)} / ${r.clearances.height.toFixed(1)} cm W/D/H`],
    ['Delivery slack', (r: Evaluation) => metricValue('delivery_slack_days', r.metrics.delivery_slack_days)],
    ['Capacity', (r: Evaluation) => `${r.product.capacityKg} kg`],
    ['Energy / 100 cycles', (r: Evaluation) => `${r.product.energyKwhPer100} kWh`],
    ['Water / cycle', (r: Evaluation) => `${r.product.waterLitresPerCycle} L`],
    ['Spin noise', (r: Evaluation) => `${r.product.noiseDb} dB · ${r.product.noiseClass}`],
    ['Spin speed', (r: Evaluation) => `${r.product.spinSpeed} rpm`],
    ['Eco cycle', (r: Evaluation) => `${Math.floor(r.product.cycleMinutes / 60)}h ${r.product.cycleMinutes % 60}m`],
    ['Machine type', (r: Evaluation) => r.product.type],
    ['Installed size', (r: Evaluation) => `${r.product.widthCm} × ${r.product.installedDepthCm} × ${r.product.heightCm} cm`],
    ['Warranty', (r: Evaluation) => `${r.product.warrantyYears} years`],
  ] as const;
  const visible = data.filter(([, getter], index) => showAll || index < 6 || new Set(compared.map(getter)).size > 1);
  return (
    <section className="comparison-section" aria-labelledby="comparison-title">
      <div className="comparison-title"><div><p className="eyebrow blue">Side by side</p><h2 id="comparison-title">Your comparison</h2></div><button onClick={onClose} aria-label="Close comparison"><X size={20}/></button></div>
      <div className="comparison-scroll"><table><thead><tr><th>What matters</th>{compared.map((row) => <th key={row.product.id}><button className="remove-compare" onClick={() => onRemove(row.product.id)} aria-label={`Remove ${row.product.model}`}><X size={14}/></button><span>{row.product.brand}</span><strong>{row.product.model}</strong><em>£{row.product.price} · {metricValue('ownership_cost', row.metrics.ownership_cost)}</em></th>)}</tr></thead><tbody>{visible.map(([label, getter]) => <tr key={label}><th>{label}</th>{compared.map((row) => <td key={row.product.id} className={!row.eligible && label === 'Eligible now' ? 'comparison-fail' : ''}>{getter(row)}</td>)}</tr>)}</tbody></table></div>
      <button className="show-all" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show meaningful differences' : 'Show all specifications'}</button>
    </section>
  );
}

function CalculationSheet({ state, rows, onOpenChange }: { state: AppState; rows: Evaluation[]; onOpenChange: (open: boolean) => void }) {
  const target = state.calculation ? rows.find((r) => r.product.id === state.calculation!.productId) : undefined;
  const explanation = target && state.decision && state.calculation ? explainMetric(target, state.calculation.metricId, state.decision) : null;
  if (!target || !explanation || !state.calculation) return null;
  const metric = state.calculation.metricId;
  return (
    <Sheet open onOpenChange={onOpenChange}><SheetContent className="calculation-sheet"><SheetHeader><p className="eyebrow blue">{target.product.brand} {target.product.model}</p><SheetTitle className="sheet-title">How this was calculated</SheetTitle><SheetDescription>Every figure uses the retailer&apos;s product data and your current assumptions.</SheetDescription></SheetHeader>
      <div className="calc-result"><span>Estimated {metricMeta[metric].label.toLowerCase()}</span><strong>{metricValue(metric, explanation.result, true)}</strong></div>
      {metric === 'ownership_cost' ? <div className="equation-rows"><div><span>Purchase price</span><strong>£{explanation.purchasePrice.toFixed(2)}</strong></div><div><span>Electricity over {state.decision!.assumptions.ownership_years} years</span><strong>£{explanation.electricityCost.toFixed(2)}</strong></div><div><span>Water over {state.decision!.assumptions.ownership_years} years</span><strong>£{explanation.waterCost.toFixed(2)}</strong></div><div className="total"><span>Estimated total</span><strong>{metricValue(metric, explanation.result, true)}</strong></div></div> : <div className="equation-rows"><div><span>Current result</span><strong>{metricValue(metric, explanation.result, true)}</strong></div><div><span>Usage</span><strong>{state.decision!.assumptions.cycles_per_week} washes/week</strong></div><div><span>Eco 40–60 energy</span><strong>{target.product.energyKwhPer100} kWh/100 cycles</strong></div><div><span>Eco 40–60 water</span><strong>{target.product.waterLitresPerCycle} L/cycle</strong></div></div>}
      <div className="calc-note"><Info size={17}/><p>{explanation.estimateBasis} {explanation.exclusions}</p></div>
    </SheetContent></Sheet>
  );
}

function DecisionPage({ state, commit, replaceTransient, onView, announce, onUndo, onRedo }: { state: AppState; commit: (fn: (s: AppState) => AppState) => AppState; replaceTransient: (fn: (s: AppState) => AppState) => AppState; onView: (p: Product) => void; announce: (text: string) => void; onUndo: () => void; onRedo: () => void }) {
  const config = state.decision!;
  const result = useMemo(() => evaluateCatalog(config, state.hidden), [config, state.hidden]);
  const [allAssumptions, setAllAssumptions] = useState(false);
  const fitOnly = result.excluded.filter((r) => r.reasonIds.length === 1 && r.reasonIds[0] === 'fits_opening').length;
  const deliveryOnly = result.excluded.filter((r) => r.reasonIds.length === 1 && r.reasonIds[0] === 'delivery_within_days').length;
  const multiple = result.excluded.filter((r) => r.reasonIds.length > 1).length;
  const setAssumption = (id: NumericAssumptionId, value: number) => {
    const next = commit((s) => ({ ...s, decision: { ...s.decision!, assumptions: { ...s.decision!.assumptions, [id]: value } } }));
    const count = evaluateCatalog(next.decision!, next.hidden).ranked.length;
    announce(`${assumptionMeta[id].label} updated. ${count} machines now meet every requirement.`);
  };
  const setMachineType = (value: 'freestanding' | 'integrated') => {
    const next = commit((s) => ({ ...s, decision: { ...s.decision!, assumptions: { ...s.decision!.assumptions, machine_type: value } } }));
    announce(`Machine type updated. ${evaluateCatalog(next.decision!, next.hidden).ranked.length} machines now meet every requirement.`);
  };
  const toggleLock = (id: AssumptionId) => commit((s) => ({ ...s, lockedIds: s.lockedIds.includes(id) ? s.lockedIds.filter((item) => item !== id) : [...s.lockedIds, id] }));
  const toggleShortlist = (id: string) => commit((s) => ({ ...s, shortlisted: s.shortlisted.includes(id) ? s.shortlisted.filter((item) => item !== id) : [...s.shortlisted, id] }));
  const toggleCompare = (id: string) => commit((s) => ({ ...s, compared: s.compared.includes(id) ? s.compared.filter((item) => item !== id) : s.compared.length < 4 ? [...s.compared, id] : s.compared }));
  const hide = (id: string) => commit((s) => ({ ...s, hidden: [...new Set([...s.hidden, id])], compared: s.compared.filter((item) => item !== id) }));
  const openCalculation = (productId: string, metricId: DerivedMetricId) => replaceTransient((s) => ({ ...s, calculation: { productId, metricId } }));
  const selectFromPlot = (id: string) => {
    commit((s) => ({ ...s, viewMode: 'cards' }));
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`product-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
  };
  const shortlistedExcluded = result.all.filter((r) => !r.eligible && state.shortlisted.includes(r.product.id));
  const chips = [
    `Space ${config.assumptions.opening_width_cm} × ${config.assumptions.opening_depth_cm} × ${config.assumptions.opening_height_cm} cm`,
    `${config.assumptions.cycles_per_week} washes each week`, `Keep for ${config.assumptions.ownership_years} years`,
    `Electricity ${config.assumptions.electricity_price_pence_per_kwh}p/kWh`, `Water ${config.assumptions.water_price_pence_per_litre}p/litre`,
    `Arrives within ${config.assumptions.delivery_within_days} days`,
    ...(config.assumptions.minimum_capacity_kg != null ? [`At least ${config.assumptions.minimum_capacity_kg} kg`] : []),
    ...(config.assumptions.maximum_purchase_price != null ? [`Up to £${config.assumptions.maximum_purchase_price}`] : []),
    ...(config.assumptions.machine_type ? [`${config.assumptions.machine_type[0].toUpperCase()}${config.assumptions.machine_type.slice(1)}`] : []),
  ];
  return (
    <main id="decision-heading" className="page-shell decision-page" tabIndex={-1}>
      <div className="breadcrumbs">Washing machines <span>/</span> Your comparison</div>
      <section className="decision-hero"><div className="hero-copy"><p className="eyebrow blue">Built around your usage</p><h1>{config.title}</h1><p>We calculate fit, delivery and estimated Eco 40–60 running costs across every machine in our store.</p></div><div className="history-actions"><Button variant="outline" size="sm" onClick={onUndo} disabled={!state.past.length}><ArrowLeft/>Undo</Button><Button variant="outline" size="sm" onClick={onRedo} disabled={!state.future.length}>Redo<ArrowRight/></Button></div></section>
      <div className="constraint-chips">{chips.map((chip, index) => <span key={chip}>{index < 3 && state.lockedIds.includes((['opening_width_cm', 'cycles_per_week', 'ownership_years'] as AssumptionId[])[index]) && <Lock size={12}/>}<Check size={14}/>{chip}</span>)}</div>
      <section className="assumptions-section" aria-labelledby="assumption-heading"><div className="section-heading"><div><p className="eyebrow">Your inputs</p><h2 id="assumption-heading">Assumptions</h2></div><button onClick={() => setAllAssumptions(!allAssumptions)}>{allAssumptions ? 'Show less' : 'All assumptions'}<ChevronDown className={allAssumptions ? 'rotate' : ''} size={16}/></button></div>
        <div className="assumption-grid">{(['opening_depth_cm','cycles_per_week','electricity_price_pence_per_kwh','delivery_within_days'] as NumericAssumptionId[]).map((id) => <AssumptionControl key={id} id={id} config={config} locked={state.lockedIds.includes(id)} onChange={setAssumption} onToggleLock={toggleLock}/>)}</div>
        {allAssumptions && <div className="assumption-grid all-grid">
          {(['opening_width_cm','opening_height_cm','ownership_years','water_price_pence_per_litre', ...(config.assumptions.minimum_capacity_kg != null ? ['minimum_capacity_kg'] : []), ...(config.assumptions.maximum_purchase_price != null ? ['maximum_purchase_price'] : [])] as NumericAssumptionId[]).map((id) => <AssumptionControl key={id} id={id} config={config} locked={state.lockedIds.includes(id)} onChange={setAssumption} onToggleLock={toggleLock}/>)}
          {config.assumptions.machine_type && <label className={`assumption-control ${state.lockedIds.includes('machine_type') ? 'is-locked' : ''}`} data-assumption="machine_type"><span>Machine type<button type="button" onClick={() => toggleLock('machine_type')} aria-label={`${state.lockedIds.includes('machine_type') ? 'Unlock' : 'Lock'} machine type`}>{state.lockedIds.includes('machine_type') ? <Lock size={14}/> : <LockOpen size={14}/>}</button></span><select value={config.assumptions.machine_type} onChange={(e) => setMachineType(e.target.value as 'freestanding' | 'integrated')}><option value="freestanding">Freestanding</option><option value="integrated">Integrated</option></select></label>}
        </div>}
      </section>
      <div className="sticky-summary"><strong>{result.ranked.length} matching machines</strong><span>{config.tradeoff ? `${metricMeta[config.tradeoff.firstMetricId].label} ↔ ${metricMeta[config.tradeoff.secondMetricId].label}` : metricMeta[config.primarySort.metricId].label}</span><a href="#assumption-heading">Edit assumptions</a></div>
      <section className="eligibility-summary"><div><span className="result-number">{result.ranked.length}</span><p><strong>of {catalog.length} machines meet every requirement.</strong><br/>{fitOnly} fail fit alone, {deliveryOnly} arrive too late, and {multiple} fail more than one requirement.</p></div><button onClick={() => commit((s) => ({ ...s, showExcluded: !s.showExcluded }))}>{state.showExcluded ? 'Hide excluded machines' : `Inspect ${result.excluded.length} exclusions`}</button></section>
      {state.showExcluded && <section className="excluded-panel"><div className="section-heading"><div><p className="eyebrow">Exact reasons</p><h2>Excluded machines</h2></div></div><div className="excluded-grid">{result.excluded.map((row) => <button key={row.product.id} onClick={() => onView(row.product)}><span>{row.product.brand} {row.product.model}</span><strong>{row.reasons.join(' · ')}</strong></button>)}</div></section>}
      {config.tradeoff && <section className="tradeoff-control"><div><p className="eyebrow blue">Prioritise</p><h2>Set your balance</h2><p>This changes the order, never the underlying product facts.</p></div><div className="slider-wrap"><div><strong>Lower upfront price</strong><strong>Quieter spin</strong></div><Slider min={0} max={100} step={1} value={[Math.round(config.tradeoff.secondMetricWeight * 100)]} onValueChange={(values) => { const n = Array.isArray(values) ? values[0] : Number(values); commit((s) => ({ ...s, decision: { ...s.decision!, tradeoff: { ...s.decision!.tradeoff!, secondMetricWeight: n / 100 } } })); announce('Product order updated for your new price and noise balance.'); }} aria-label="Balance lower upfront price against quieter spin"/><p>{Math.round((1 - config.tradeoff.secondMetricWeight) * 100)}% price · {Math.round(config.tradeoff.secondMetricWeight * 100)}% quietness</p></div></section>}
      <section className="results-section"><div className="results-header"><div><p className="eyebrow">Your results</p><h2>{result.ranked.length ? 'Machines in your current order' : 'No machine meets every requirement'}</h2></div><div className="view-tabs" role="tablist" aria-label="Results view">{(['cards','table','plot'] as const).map((mode) => <button key={mode} role="tab" aria-selected={state.viewMode === mode} onClick={() => commit((s) => ({ ...s, viewMode: mode }))}>{mode === 'plot' ? 'Tradeoff map' : mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></div>
        {!result.ranked.length ? <NoMatches config={config} onApply={(id, value) => setAssumption(id, value)}/> : state.viewMode === 'plot' ? <TradeoffPlot rows={result.ranked} config={config} state={state} onSelect={selectFromPlot} onCompare={toggleCompare}/> : state.viewMode === 'table' ? <DecisionTable rows={result.ranked} config={config} onCalculate={openCalculation} onCompare={toggleCompare}/> : <div className="decision-grid">{result.ranked.map((row) => <DecisionCard key={row.product.id} row={row} config={config} state={state} onCalculate={openCalculation} onShortlist={toggleShortlist} onCompare={toggleCompare} onHide={hide} onView={onView}/>)}</div>}
      </section>
      {state.hidden.length > 0 && <div className="restore-bar"><EyeOff size={17}/><span>{state.hidden.length} hidden machine{state.hidden.length === 1 ? '' : 's'}</span><button onClick={() => commit((s) => ({ ...s, hidden: [] }))}>Restore all</button></div>}
      {shortlistedExcluded.length > 0 && <section className="shortlist-warning"><h2>Saved, but no longer eligible</h2>{shortlistedExcluded.map((r) => <p key={r.product.id}><strong>{r.product.brand} {r.product.model}</strong> · {r.reasons.join(', ')}</p>)}</section>}
      <Comparison state={state} rows={result.all} onRemove={toggleCompare} onClose={() => commit((s) => ({ ...s, compared: [] }))}/>
      <CalculationSheet state={state} rows={result.all} onOpenChange={(open) => !open && replaceTransient((s) => ({ ...s, calculation: null }))}/>
      {state.compared.length > 0 && state.compared.length < 2 && <div className="compare-bottom"><span>Select one more machine to compare</span><button onClick={() => commit((s) => ({ ...s, compared: [] }))}>Clear</button></div>}
      <footer className="decision-footer"><p>Costs are estimates based on Eco 40–60 specifications and your inputs.</p><button onClick={() => commit((s) => ({ ...s, decision: null, calculation: null, showExcluded: false }))}><RotateCcw size={15}/>Return to standard results</button></footer>
    </main>
  );
}

function DecisionTable({ rows, config, onCalculate, onCompare }: { rows: Evaluation[]; config: DecisionConfig; onCalculate: (productId: string, metric: DerivedMetricId) => void; onCompare: (id: string) => void }) {
  return <div className="decision-table table-scroll"><table><thead><tr><th>Machine</th><th>Price</th>{config.visibleMetricIds.map((id) => <th key={id}>{metricMeta[id].label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.product.id}><th><span>#{row.rank}</span>{row.product.brand} {row.product.model}</th><td>£{row.product.price}</td>{config.visibleMetricIds.map((id) => <td key={id}>{!['purchase_price','spin_noise_db','capacity_kg'].includes(id) ? <button onClick={() => onCalculate(row.product.id, id as DerivedMetricId)}>{metricValue(id, row.metrics[id])}</button> : metricValue(id, row.metrics[id])}</td>)}<td><button onClick={() => onCompare(row.product.id)}>Compare</button></td></tr>)}</tbody></table></div>;
}

function NoMatches({ config, onApply }: { config: DecisionConfig; onApply: (id: NumericAssumptionId, value: number) => void }) {
  const suggestions = findNearestRelaxations(config);
  return <div className="no-matches"><div><p className="eyebrow">Nothing hidden</p><h3>No machine meets every requirement.</h3><p>These are the smallest single changes that would create real choices.</p></div><div>{suggestions.map((s) => <button key={s.id} onClick={() => onApply(s.id, s.value)}><strong>{s.id === 'delivery_within_days' ? `Allow ${s.delta.toFixed(0)} more delivery days` : `Increase ${s.label.toLowerCase()} by ${s.delta.toFixed(1)} ${assumptionMeta[s.id].displayUnit}`}</strong><span>Include {s.admitted} model{s.admitted === 1 ? '' : 's'}</span></button>)}</div></div>;
}

function DebugHarness({ handlers, state }: { handlers: WebMcpHandlers; state: AppState }) {
  const [output, setOutput] = useState('');
  const invoke = async (name: keyof WebMcpHandlers, input: Record<string, unknown>) => setOutput(JSON.stringify(await handlers[name](input), null, 2));
  return <aside className="debug-harness"><strong>WebMCP debug · revision {state.revision}</strong><div><button onClick={() => invoke('readPage', {})}>read_page</button><button onClick={() => invoke('createDecisionView', { title: defaultDecision.title, assumptions: defaultDecision.assumptions, requirements: defaultDecision.requirements, visible_metric_ids: defaultDecision.visibleMetricIds, primary_sort: { metric_id: 'ownership_cost', direction: 'asc' }, tradeoff: { first_metric_id: 'purchase_price', second_metric_id: 'spin_noise_db', second_metric_weight: .5 }, plot: { x_metric_id: 'purchase_price', y_metric_id: 'spin_noise_db', size_metric_id: 'capacity_kg' } })}>canonical create</button><button onClick={() => invoke('updateDecisionView', { base_revision: state.revision - 1, operations: [{ operation: 'set_title', title: 'Stale test' }] })}>stale test</button></div>{output && <pre>{output}</pre>}</aside>;
}

export default function Home() {
  const [state, setState] = useState<AppState>(blankState);
  const [hydrated, setHydrated] = useState(false);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [building, setBuilding] = useState(false);
  const [toast, setToast] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const stateRef = useRef(state);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { const parsed = JSON.parse(stored) as AppState; stateRef.current = { ...blankState, ...parsed }; setState(stateRef.current); }
    } catch { localStorage.removeItem(STORAGE_KEY); }
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, hydrated]);

  const commit = useCallback((fn: (state: AppState) => AppState) => {
    const current = stateRef.current;
    const proposed = fn(current);
    const next = { ...proposed, revision: current.revision + 1, past: [...current.past, snapshotOf(current)].slice(-20), future: [] };
    stateRef.current = next; setState(next); return next;
  }, []);

  const replaceTransient = useCallback((fn: (state: AppState) => AppState) => {
    const next = fn(stateRef.current); stateRef.current = next; setState(next); return next;
  }, []);

  const undo = useCallback(() => {
    const current = stateRef.current;
    const previous = current.past.at(-1); if (!previous) return;
    const next: AppState = { ...previous, revision: current.revision + 1, past: current.past.slice(0, -1), future: [snapshotOf(current), ...current.future].slice(0, 20) };
    stateRef.current = next; setState(next);
  }, []);
  const redo = useCallback(() => {
    const current = stateRef.current;
    const following = current.future[0]; if (!following) return;
    const next: AppState = { ...following, revision: current.revision + 1, past: [...current.past, snapshotOf(current)].slice(-20), future: current.future.slice(1) };
    stateRef.current = next; setState(next);
  }, []);

  const handlers = useMemo<WebMcpHandlers>(() => {
    const readPage = async (_input: Record<string, unknown>, signal?: AbortSignal) => {
      abortIfNeeded(signal);
      const current = stateRef.current;
      const evaluated = current.decision ? evaluateCatalog(current.decision, current.hidden) : null;
      return jsonSafe({ ok: true, category: 'washing_machines', currency: 'GBP', assumptions: Object.entries(assumptionMeta).map(([id, m]) => ({ id, storage_unit: m.storageUnit, display_unit: m.displayUnit, bounds: { minimum: m.min, maximum: m.max }, description: m.description, example: m.example })), requirements: requirementIds, metrics: Object.entries(metricMeta).map(([id, m]) => ({ id, unit: m.unit, better_direction: m.direction, required_assumption_ids: m.requires })), comparison_row_ids: comparisonRowIds, standard_filters: current.decision ? null : { price: true, brand: true, machine_type: true, capacity: true }, decision_view: current.decision, current_revision: current.revision, eligible_count: evaluated?.ranked.length ?? catalog.length, products: compactRows(current), locked_assumption_ids: current.lockedIds, shortlisted_product_ids: current.shortlisted, hidden_product_ids: current.hidden, compared_product_ids: current.compared, exclusion_counts: evaluated?.exclusions ?? {} });
    };

    const createDecisionView = async (input: Record<string, unknown>, signal?: AbortSignal) => {
      const current = stateRef.current;
      if (current.decision && input.base_revision == null) return toolFailure('VIEW_REQUIRES_REVISION', 'This page already has a decision view. Read it again and include its current revision.', { current_revision: current.revision });
      if (current.decision && input.base_revision !== current.revision) return toolFailure('STALE_VIEW', 'This page changed since the assistant last read it. It needs to read the current view before changing it.', { current_revision: current.revision });
      if (!input.assumptions || typeof input.assumptions !== 'object' || Array.isArray(input.assumptions)) return toolFailure('MISSING_INPUT', 'Assumptions must be an object containing supported assumption IDs.', { valid_ids: assumptionIds });
      if (!Array.isArray(input.requirements) || input.requirements.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) return toolFailure('INVALID_REQUIREMENT', 'Requirements must be an array of supported requirement objects.', { valid_ids: requirementIds });
      if (!Array.isArray(input.visible_metric_ids)) return toolFailure('MISSING_INPUT', 'visible_metric_ids must be an array of supported metric IDs.', { valid_ids: metricIds });
      if (!input.primary_sort || typeof input.primary_sort !== 'object' || Array.isArray(input.primary_sort)) return toolFailure('MISSING_INPUT', 'primary_sort must include metric_id and direction.');
      const incomingAssumptions = (input.assumptions ?? {}) as Assumptions;
      const assumptions = { ...incomingAssumptions };
      if (current.decision) for (const id of current.lockedIds) if (current.decision.assumptions[id as keyof Assumptions] != null) (assumptions as Record<string, unknown>)[id] = current.decision.assumptions[id as keyof Assumptions];
      const sort = (input.primary_sort ?? {}) as Record<string, unknown>;
      const rawTradeoff = input.tradeoff as Record<string, unknown> | undefined;
      const rawPlot = input.plot as Record<string, unknown> | undefined;
      const config: DecisionConfig = {
        id: current.decision?.id ?? 'personal-washer-comparison', title: stringInput(input.title), assumptions,
        requirements: ((input.requirements ?? []) as Array<Record<string, unknown>>).map((r) => ({ id: String(r.id) as RequirementId, value: r.value as number | string | undefined })),
        visibleMetricIds: (input.visible_metric_ids ?? []) as MetricId[], primarySort: { metricId: stringInput(sort.metric_id) as MetricId, direction: sort.direction === 'desc' ? 'desc' : 'asc' },
        tradeoff: rawTradeoff ? { firstMetricId: String(rawTradeoff.first_metric_id) as MetricId, secondMetricId: String(rawTradeoff.second_metric_id) as MetricId, secondMetricWeight: Number(rawTradeoff.second_metric_weight) } : undefined,
        plot: rawPlot ? { xMetricId: stringInput(rawPlot.x_metric_id) as MetricId, yMetricId: stringInput(rawPlot.y_metric_id) as MetricId, sizeMetricId: rawPlot.size_metric_id ? stringInput(rawPlot.size_metric_id) as MetricId : undefined } : { xMetricId: 'purchase_price', yMetricId: 'spin_noise_db', sizeMetricId: 'capacity_kg' },
      };
      const invalid = validateConfig(config); if (invalid) return invalid;
      abortIfNeeded(signal); setBuilding(true); await new Promise((resolve) => setTimeout(resolve, 180));
      try { abortIfNeeded(signal); } catch (error) { setBuilding(false); throw error; }
      if (stateRef.current.revision !== current.revision) { setBuilding(false); return toolFailure('STALE_VIEW', 'This page changed while the new view was being prepared. The assistant needs to read the current view before changing it.', { current_revision: stateRef.current.revision }); }
      const next = commit((s) => ({ ...s, decision: config, compared: s.compared.every((id) => productById.has(id)) ? s.compared : [], viewMode: config.plot ? 'plot' : 'cards', calculation: null }));
      setBuilding(false); setToast(true); setTimeout(() => setToast(false), 4200); setLiveMessage(`${evaluateCatalog(config, next.hidden).ranked.length} of ${catalog.length} machines fit every requirement.`);
      history.replaceState({ decision: false }, ''); history.pushState({ decision: true }, '');
      await delayPaint(); document.getElementById('decision-heading')?.focus();
      const evaluated = evaluateCatalog(config, next.hidden);
      return jsonSafe({ ok: true, revision: next.revision, eligible_count: evaluated.ranked.length, exclusion_counts: evaluated.exclusions, products: compactRows(next), strong_tradeoff_product_ids: evaluated.strong, active_derived_metric_summaries: config.visibleMetricIds.filter((id) => metricMeta[id].requires.length).map((id) => ({ metric_id: id, range: [Math.min(...evaluated.ranked.map((r) => r.metrics[id])), Math.max(...evaluated.ranked.map((r) => r.metrics[id]))] })) });
    };

    const updateDecisionView = async (input: Record<string, unknown>, signal?: AbortSignal) => {
      const current = stateRef.current;
      if (!current.decision) return toolFailure('MISSING_INPUT', 'Create a decision view before updating it.');
      if (input.base_revision !== current.revision) return toolFailure('STALE_VIEW', 'This page changed since the assistant last read it. It needs to read the current view before changing it.', { current_revision: current.revision });
      if (!Array.isArray(input.operations) || !input.operations.length || input.operations.length > 12) return toolFailure('INVALID_REQUIREMENT', 'Provide between one and twelve supported operations.');
      const draft = cloneDecision(current.decision); const changed: string[] = [];
      if ((input.operations as unknown[]).some((item) => !item || typeof item !== 'object' || Array.isArray(item))) return toolFailure('INVALID_REQUIREMENT', 'Every operation must be a supported operation object.');
      for (const raw of input.operations as Array<Record<string, unknown>>) {
        const operation = stringInput(raw.operation) || stringInput(raw.type);
        if (operation === 'set_title') { draft.title = stringInput(raw.title) || stringInput(raw.value); changed.push('title'); }
        else if (operation === 'set_assumption') { const id = String(raw.assumption_id) as AssumptionId; if (!assumptionIds.includes(id)) return toolFailure('UNSUPPORTED_ASSUMPTION', `Unsupported assumption “${id}”.`, { valid_ids: assumptionIds }); if (current.lockedIds.includes(id)) return toolFailure('LOCKED_ASSUMPTION', `${assumptionMeta[id].label} is locked by the shopper and cannot be changed.`, { field: id, current_revision: current.revision }); (draft.assumptions as Record<string, unknown>)[id] = raw.value; changed.push(id); }
        else if (operation === 'remove_assumption') { const id = String(raw.assumption_id) as AssumptionId; if (current.lockedIds.includes(id)) return toolFailure('LOCKED_ASSUMPTION', `${assumptionMeta[id].label} is locked by the shopper and cannot be removed.`, { field: id, current_revision: current.revision }); delete (draft.assumptions as Record<string, unknown>)[id]; changed.push(id); }
        else if (operation === 'add_requirement' || operation === 'update_requirement') { const nested = (raw.requirement ?? raw) as Record<string, unknown>; const id = String(nested.id ?? raw.requirement_id) as RequirementId; if (!requirementIds.includes(id)) return toolFailure('INVALID_REQUIREMENT', `Unsupported requirement “${id}”.`, { valid_ids: requirementIds }); draft.requirements = [...draft.requirements.filter((r) => r.id !== id), { id, value: nested.value as number | string | undefined }]; changed.push(id); }
        else if (operation === 'remove_requirement') { const id = String(raw.requirement_id) as RequirementId; draft.requirements = draft.requirements.filter((r) => r.id !== id); changed.push(id); }
        else if (operation === 'show_metric') { const id = String(raw.metric_id) as MetricId; if (!metricIds.includes(id)) return toolFailure('UNSUPPORTED_METRIC', `Unsupported metric “${id}”.`, { valid_ids: metricIds }); draft.visibleMetricIds = [...new Set([...draft.visibleMetricIds, id])]; changed.push(id); }
        else if (operation === 'hide_metric') { const id = String(raw.metric_id) as MetricId; draft.visibleMetricIds = draft.visibleMetricIds.filter((m) => m !== id); changed.push(id); }
        else if (operation === 'set_primary_sort') { const nested = (raw.primary_sort ?? raw) as Record<string, unknown>; draft.primarySort = { metricId: String(nested.metric_id) as MetricId, direction: nested.direction === 'desc' ? 'desc' : 'asc' }; changed.push('primary_sort'); }
        else if (operation === 'set_tradeoff') { const nested = (raw.tradeoff ?? raw) as Record<string, unknown>; draft.tradeoff = { firstMetricId: String(nested.first_metric_id) as MetricId, secondMetricId: String(nested.second_metric_id) as MetricId, secondMetricWeight: Number(nested.second_metric_weight) }; changed.push('tradeoff'); }
        else if (operation === 'clear_tradeoff') { delete draft.tradeoff; changed.push('tradeoff'); }
        else if (operation === 'set_plot_axes') { const nested = (raw.plot ?? raw) as Record<string, unknown>; draft.plot = { xMetricId: stringInput(nested.x_metric_id) as MetricId, yMetricId: stringInput(nested.y_metric_id) as MetricId, sizeMetricId: nested.size_metric_id ? stringInput(nested.size_metric_id) as MetricId : undefined }; changed.push('plot'); }
        else return toolFailure('INVALID_REQUIREMENT', `Unsupported operation “${operation}”.`);
      }
      const invalid = validateConfig(draft); if (invalid) return invalid; abortIfNeeded(signal);
      const next = commit((s) => ({ ...s, decision: draft })); setLiveMessage(`Decision view updated. ${evaluateCatalog(draft, next.hidden).ranked.length} machines meet every requirement.`); await delayPaint(); highlightAgentChanges(changed);
      const evaluated = evaluateCatalog(draft, next.hidden);
      return jsonSafe({ ok: true, revision: next.revision, changed_controls: changed, eligible_count: evaluated.ranked.length, exclusion_counts: evaluated.exclusions, products: compactRows(next), strong_tradeoff_product_ids: evaluated.strong });
    };

    const compareProducts = async (input: Record<string, unknown>, signal?: AbortSignal) => {
      const current = stateRef.current;
      if (!current.decision) return toolFailure('INVALID_COMPARISON', 'Create a decision view before comparing products.');
      if (input.base_revision !== current.revision) return toolFailure('STALE_VIEW', 'This page changed since the assistant last read it. It needs to read the current view before changing it.', { current_revision: current.revision });
      const ids = input.product_ids as string[];
      if (!Array.isArray(ids) || ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) return toolFailure('INVALID_COMPARISON', 'Choose two to four unique product IDs.');
      const unknown = ids.find((id) => !productById.has(id)); if (unknown) return toolFailure('UNKNOWN_PRODUCT', `Unknown product “${unknown}”.`, { valid_ids: catalog.map((p) => p.id) });
      const hidden = ids.find((id) => current.hidden.includes(id)); if (hidden) return toolFailure('HIDDEN_PRODUCT', `${hidden} was hidden by the shopper. Only the shopper can restore it.`, { product_id: hidden });
      if (input.row_ids && (!Array.isArray(input.row_ids) || (input.row_ids as string[]).some((id) => !comparisonRowIds.includes(id)))) return toolFailure('INVALID_COMPARISON', 'One or more comparison rows are unsupported.', { valid_ids: comparisonRowIds });
      abortIfNeeded(signal); const next = commit((s) => ({ ...s, compared: ids })); await delayPaint();
      const all = evaluateCatalog(next.decision!, next.hidden).all.filter((r) => ids.includes(r.product.id));
      return jsonSafe({ ok: true, revision: next.revision, compared_product_ids: ids, differing_rows: comparisonRowIds.filter((rowId) => rowId !== 'machine_type' || new Set(all.map((r) => r.product.type)).size > 1) });
    };

    const showCalculation = async (input: Record<string, unknown>, signal?: AbortSignal) => {
      const current = stateRef.current;
      if (!current.decision) return toolFailure('MISSING_INPUT', 'Create a decision view before opening a calculation.');
      if (input.base_revision !== current.revision) return toolFailure('STALE_VIEW', 'This page changed since the assistant last read it. It needs to read the current view before changing it.', { current_revision: current.revision });
      const productId = String(input.product_id), metricId = String(input.metric_id) as DerivedMetricId;
      const product = productById.get(productId); if (!product) return toolFailure('UNKNOWN_PRODUCT', `Unknown product “${productId}”.`, { valid_ids: catalog.map((p) => p.id) });
      if (!metricIds.includes(metricId) || !metricMeta[metricId].requires.length) return toolFailure('UNSUPPORTED_METRIC', `“${metricId}” is not a calculated metric.`, { valid_ids: metricIds.filter((id) => metricMeta[id].requires.length) });
      abortIfNeeded(signal); replaceTransient((s) => ({ ...s, calculation: { productId, metricId } })); document.getElementById(`product-${productId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); await delayPaint();
      return jsonSafe({ ok: true, revision: current.revision, breakdown: explainMetric(evaluateProduct(product, current.decision), metricId, current.decision) });
    };
    return { readPage, createDecisionView, updateDecisionView, compareProducts, showCalculation };
  }, [commit, replaceTransient]);

  useEffect(() => {
    if (!hydrated) return;
    const registration = registerDecisionTools(handlers); queueMicrotask(() => setMcpAvailable(registration.available));
    return registration.abort;
  }, [hydrated, handlers]);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (event.state?.decision === false && stateRef.current.decision) replaceTransient((s) => ({ ...s, decision: null, calculation: null }));
      else if (event.state?.decision === true && !stateRef.current.decision) {
        const prior = [...stateRef.current.past].reverse().find((entry) => entry.decision)?.decision;
        if (prior) replaceTransient((s) => ({ ...s, decision: prior }));
      }
    };
    addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop);
  }, [replaceTransient]);

  const debug = hydrated && new URLSearchParams(location.search).get('debug') === '1';
  return (
    <div className={building ? 'app is-building' : 'app'}>
      <Header mcpAvailable={mcpAvailable}/>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
      {building && <output className="building-pill"><span/>Building your comparison…</output>}
      {toast && <div className="decision-toast">Decision view created <span>·</span><button onClick={() => { undo(); setToast(false); }}>Undo</button></div>}
      {state.decision ? <DecisionPage state={state} commit={commit} replaceTransient={replaceTransient} onView={setSelectedProduct} announce={setLiveMessage} onUndo={undo} onRedo={redo}/> : <StandardPage onView={setSelectedProduct}/>} 
      <ProductDetail product={selectedProduct} open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}/>
      {debug && <DebugHarness handlers={handlers} state={state}/>} 
    </div>
  );
}

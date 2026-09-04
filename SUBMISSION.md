# Devpost submission copy

## Project title

Morph

## Tagline

The page becomes the interface you need.

## One-line description

Three ordinary webpages use WebMCP to turn a natural-language request into a persistent, directly editable interface—and recompose it again without losing the person’s choices.

## Inspiration

The web still asks every person to adapt to one interface chosen in advance. Product grids, travel results, and news feeds expose plenty of information, but the work of turning it into a decision is left to the visitor. We wanted to test the reverse: what if the page could adapt to the person?

## What it does

Morph contains three convincing ordinary websites. Hearth & Home can turn a 28-product washer grid into questionnaires, tables, charts, comparisons, cost breakdowns, calendars, or recommendation boards. Wayline can turn 18 advertised travel results into complete journeys, timelines, stress tests, and tradeoff views. The Current can turn 30 overlapping articles into finite editions, event timelines, source maps, and reading queues.

A real browser-assistant request composes those interfaces on the existing page. The result remains interactive, and a follow-up can reshape it without discarding relevant saves, pins, edits, hidden choices, or locks.

The three concrete reveals are:

- **Hearth & Home: 28 → 9.** Nine washers fit the canonical home, cost, and delivery requirements. The Elmridge E8 Eco’s £1,081.40 eight-year total opens into exact purchase, energy, and water arithmetic.
- **Wayline: 1h 10m → 4h 26m.** Eighteen advertised results become seven eligible complete journeys. AeroSwift AS 104’s total resolves to `35 + 85 + 70 + 15 + 30 + 31 = 266 minutes`.
- **The Current: 30 → 5.** Thirty articles across ten story clusters become five distinct developments totaling 588 seconds, displayed as 9m 48s.

## Why this is a strong WebMCP use case

The assistant should not invent the site’s facts or recreate its business logic in chat. WebMCP gives it a safe vocabulary for reading site-owned truth and arranging site-owned native components. The assistant decides what interface serves the request; the webpage remains authoritative for products, schedules, verified facts, eligibility, provenance, and arithmetic.

This is more than filtering a fixed dashboard. The assistant can select, order, remove, and reconfigure independent components such as questions, ranked cards, compact tables, charts, comparisons, timelines, calendars, tradeoff boards, provenance maps, explanations, and exact relaxation choices.

## How it improves the human experience

People spend less time translating a goal into dozens of filters and more time evaluating an interface already organised around that goal. Exact calculations and exclusions stay inspectable, direct controls remain first-class, and impossible requests offer truthful recovery choices.

Each website keeps its own visual language: Hearth & Home remains a refined retailer, Wayline remains a calm travel product, and The Current remains a serious newspaper. The useful result belongs to the page rather than becoming a disposable answer elsewhere.

## What people and agents can do together

The person expresses intent and retains final control. The assistant composes and recomposes. The site validates every operation and performs every calculation.

A shopper can save a washer, adjust a measurement, and ask for a simpler decision board. A traveller can save a train, lock a luggage choice, change destination, and ask for a delay-aware timeline. A reader can pin a story, hide a publication, and replace a finite edition with a provenance map. The later request respects those human choices whenever they remain relevant.

## How it differs from receiving an answer in ChatGPT, Atlas, Comet, or another autonomous browser

A conventional chat answer is separated from the source page and quickly becomes stale. An autonomous browser can operate controls the page already has. Morph makes the webpage itself the persistent output: native, editable, stateful, and able to become a structurally different interface after the next request.

The assistant does not claim authority over product specifications, journey times, article facts, formulas, or provenance. It asks the cooperating page to compose an interface from the page’s own records, calculations, actions, and visual components.

## How it was built

The project uses React 19, TypeScript, Vinext, Vite, and WebMCP. Each route exposes deterministic first-party records, calculations, safe state operations, and a shared composition vocabulary. Inputs resolve through site-owned IDs and validated configuration; arbitrary HTML, CSS, scripts, URLs, factual claims, and formulas are not accepted.

Route state persists locally. Revision checks, undo and redo, accessible dialogs, live announcements, focus management, reduced-motion handling, and responsive components keep human and assistant changes coherent. The public application is built and deployed to Cloudflare with Wrangler.

## Challenges

- Making composition genuinely open-ended without allowing model-authored facts or markup.
- Preserving human-owned state across structurally different follow-up requests.
- Keeping calculations, provenance, zero-result recovery, dialogs, history, and live announcements coherent.
- Making each composed result feel native to its source website instead of collapsing all three into one generic dashboard.
- Making dense comparisons and timelines understandable at 390px without unexplained horizontal scrolling.

## Accomplishments

- Three distinct websites share one reusable composition model.
- The canonical results remain deterministic and inspectable: `28 → 9`, `1h 10m → 4h 26m`, and `30 → 5`.
- Every factual value and derived number comes from the webpage.
- Human edits, saves, pins, hidden choices, and locks survive relevant recompositions.
- The ordinary page, transformation, direct editing, follow-up composition, undo/redo, persistence, and zero-result recovery all remain part of one continuous interface.

## What was learned

WebMCP is most powerful when it is treated as an interface-composition contract, not merely another way to invoke isolated actions. The useful boundary is clear: the assistant owns intent and arrangement; the website owns truth and consequences.

We also learned that persistence is part of the interaction model, not a convenience. A recomposed interface only feels collaborative when it acknowledges the decisions a person already made.

## Credible next steps

- Formalise the component vocabulary into a reusable authoring package.
- Connect the same model to live inventory, schedules, and editorial systems.
- Add authenticated, cross-device persistence.
- Evaluate composition quality, accessibility, and trust with real users.
- Explore portable human-owned constraints that can be shared safely across cooperating websites.

## Built with

- React 19
- TypeScript
- Vinext
- Vite
- WebMCP
- Cloudflare Workers
- Wrangler
- Recharts
- Base UI
- Deterministic first-party demonstration data

## Public links

- Showcase: **https://morph.carry-protocol.workers.dev/showcase**
- Hearth & Home: **https://morph.carry-protocol.workers.dev/**
- Wayline: **https://morph.carry-protocol.workers.dev/journeys**
- The Current: **https://morph.carry-protocol.workers.dev/edition**
- Repository: **https://github.com/ely2ba/morph**
- Demo video: **Add the public YouTube URL here after recording**

## Exact testing instructions

1. Open `https://morph.carry-protocol.workers.dev/journeys?fresh=1` and confirm the ordinary page shows 18 travel results.
2. Use ChatGPT’s real browser assistant to send the first Wayline prompt below.
3. Confirm the page—not chat—recomposes, shows 7 eligible journeys, and reveals AS 104’s 4h 26m complete journey.
4. Open AS 104’s calculation and confirm `35 + 85 + 70 + 15 + 30 + 31 = 266 minutes`.
5. Save Northstar Rail NR 914 at 07:16 and lock checked luggage.
6. Send the Wayline follow-up. Confirm De Pijp appears everywhere, the page becomes a delay-aware timeline, and the saved train and luggage lock remain.
7. Open `https://morph.carry-protocol.workers.dev/?fresh=1`, run the canonical washer request, and confirm 9 of 28 machines qualify.
8. Open the Elmridge E8 Eco calculation and confirm the £1,081.40 total and purchase, energy, and water components.
9. Open `https://morph.carry-protocol.workers.dev/edition?fresh=1`, run the ten-minute edition request, and confirm 30 articles become 5 developments totaling 9m 48s.
10. Replace that edition with the tidal-energy timeline, then the provenance map. Confirm repeated reports and original sources remain inspectable.
11. Directly edit a control on each route, then verify undo, redo, reload persistence, and the route-specific `?fresh=1` reset.
12. Create an impossible request and confirm at least one displayed exact relaxation produces a feasible result.
13. Repeat the main flows at 390px and confirm mobile comparison cues, sticky labels, focus handling, and the absence of unexplained page-level horizontal scrolling.

## Prompts to try

### Hearth & Home

1. “Turn this catalog into a decision workspace for a renter with a shallow alcove. Begin with the questions I still need to answer, then show a shortlist, a cost-versus-noise chart, and a comparison.”
2. “I measured it: 58 cm deep. Remove the questions, make the remaining products a compact table, and put the quietest machine below £550 first.”
3. “Replace the table with a simple recommendation for my parents. Show what they sacrifice with each alternative and add a delivery calendar.”

### Wayline

1. “Build a complete door-to-door timeline. Separate travel, waiting, terminal buffers, walking, and luggage time.”
2. “Turn this into a delay stress test. Show what happens to every arrival after a 20-minute disruption.”
3. “Now make it a simple day plan containing only step-free options that reach De Pijp before 7pm.”

### The Current

1. “Give me a finite ten-minute edition. Merge repeated coverage, preserve original reporting, and put genuinely new developments first.”
2. “Replace the edition with a chronological timeline of the tidal-energy story. Include only moments when a new verified fact appeared.”
3. “Turn the timeline into a provenance map showing who reported each fact first, which publications repeated it, and where the evidence changed.”

## Recommended Devpost screenshot order and captions

1. **Showcase hero** — “Three ordinary websites. One sentence. Countless useful interfaces.”
2. **Hearth & Home ordinary** — “Before: a conventional 28-product washer catalog.”
3. **Hearth & Home decision workspace** — “One request produces a fit-and-cost workspace: 9 of 28 machines qualify.”
4. **Hearth & Home alternative composition** — “A follow-up replaces the workspace with a simpler recommendation, tradeoff board, and delivery calendar.”
5. **Wayline ordinary** — “Before: 18 journeys dominated by advertised duration.”
6. **Wayline complete journey** — “After: seven eligible complete journeys; 1h 10m becomes 4h 26m door to door.”
7. **Wayline delay timeline** — “The same page becomes a disruption-aware timeline while preserving the saved 07:16 train and luggage lock.”
8. **The Current ordinary** — “Before: 30 headlines with repeated coverage.”
9. **The Current finite edition** — “After: five distinct developments totaling 9m 48s.”
10. **The Current provenance map** — “A follow-up reveals who originated each fact, who repeated it, and where the evidence changed.”
11. **Hearth & Home mobile** — “A directly editable shopping decision interface at 390px.”
12. **Wayline mobile** — “Complete journeys and comparisons remain usable on mobile.”
13. **The Current mobile** — “A finite, source-preserving edition in a compact editorial layout.”

## Data and media disclosure

All brands, products, journeys, operators, publications, reporters, people, and events are fictional demonstration data. The fictional product and editorial images were generated for this project and stored locally. No draft recording is part of the public submission assets.

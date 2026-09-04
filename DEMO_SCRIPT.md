# The You-Shaped Web — final demo recording script

Target runtime: **2 minutes 30 seconds**. Record at 1440 × 900 with the ChatGPT browser assistant visible whenever a request is entered. Use the public deployment, not localhost. Record each route as a separate take, then edit the takes together.

Before recording:

- Close unrelated tabs and notifications.
- Use a fresh browser profile or clear the three route-specific demo states.
- Set browser zoom to 100% and keep the same window size throughout.
- Let fonts and images load before each take.
- Keep the pointer in the lower-right margin unless an action is being demonstrated.
- Do not record or show developer tools, tool schemas, JSON, console output, or this script.

## 0:00–0:08 — The ordinary travel page

**Clean-start URL:** `https://you-shaped-web.carry-protocol.workers.dev/journeys?fresh=1`

**Before recording:** Wait for the query parameter to clear automatically. The Wayline hero, search controls, and “18 journeys” result count should be visible. Do not open the assistant yet.

**Picture:** Begin on the ordinary page. Hold for two seconds, then move the pointer once from the advertised duration area toward the result count. Do not scroll.

**Narration:**

> “Travel search says this flight takes one hour ten. But that is not the journey from my door to my stay.”

## 0:08–0:25 — Ask for the first interface

**URL:** Remain on `https://you-shaped-web.carry-protocol.workers.dev/journeys` after the clean-start redirect.

**Action:** Open the real ChatGPT browser assistant. Paste the following request, pause just long enough for it to be readable, then send it.

**Exact prompt:**

> I’m leaving from Shoreditch and staying in Amsterdam’s Jordaan. Build a complete door-to-door decision interface. Rank these by total time, walking, and missed-connection risk. I care twice as much about reliability as speed, have a checked bag, and need to arrive by 7pm. Show a timeline that separates travel, waiting, terminal buffers, walking, luggage, and transfers.

**Narration:**

> “Instead of working through filters, I ask the browser assistant for the interface I need.”

**Transformation pause:** After sending, leave the ordinary results visible. Do not move or scroll while Wayline shows “Rebuilding 18 results around the whole journey…” and reorganises the page. Let the focused result heading remain on screen for two seconds after the transition completes.

## 0:25–0:40 — Reveal the complete journey

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/journeys`

**Picture:** Show the new structure and the “7 qualify” result. Scroll only enough to put AeroSwift AS 104 and its advertised-versus-complete duration in the middle third of the frame.

**Narration:**

> “Wayline receives a real WebMCP request. It keeps authority over every time, rule, and calculation; the assistant chooses how to compose them. Eighteen results become seven complete journeys.”

## 0:40–0:54 — Open the exact calculation

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/journeys`

**Action:** Open AS 104’s door-to-door calculation.

**Picture:** Pause with both “1h 10m” and “4h 26m” visible if possible. Otherwise show the drawer with `35 + 85 + 70 + 15 + 30 + 31 = 266 minutes`. Hold for two seconds.

**Narration:**

> “That one-hour-ten flight is really four hours twenty-six door to door. Every minute comes from Wayline’s own calculation.”

## 0:54–1:05 — Make human-owned choices

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/journeys`

**Action:** Close the calculation. Save **Northstar Rail NR 914 at 07:16**, then lock the **checked luggage** choice. Make each click deliberate and pause briefly after the visual confirmation.

**Narration:**

> “I save the seven-sixteen train and lock checked luggage. Those are my choices, not suggestions from the model.”

## 1:05–1:25 — Recompose the same page

**URL:** Remain on `https://you-shaped-web.carry-protocol.workers.dev/journeys`; do not reload or use a clean-start link.

**Action:** Open the browser assistant and send the follow-up below.

**Exact prompt:**

> I’m staying in De Pijp now. Turn this into a delay stress test and show the day as a timeline. Keep my saved train and locked luggage.

**Transformation pause:** Keep the current interface visible while the affected components rearrange. Do not scroll during the transition. After completion, hold on the new timeline for two seconds.

**Narration:**

> “My stay changes. The same page becomes a delay stress test and day timeline. It does not reset.”

## 1:25–1:36 — Prove preservation

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/journeys`

**Picture:** Point once to “De Pijp,” once to the saved NR 914 state, and once to the checked-luggage lock. Avoid circling the cursor.

**Narration:**

> “The saved train and luggage lock survive. The result is not in chat. It is still Wayline—live, editable, and ready for another request.”

## 1:36–1:54 — Hearth & Home

**Clean-start URL:** `https://you-shaped-web.carry-protocol.workers.dev/?fresh=1`

**Before entering the prompt:** Wait for the query parameter to clear. Show the ordinary product grid and its 28-product count for two seconds.

**Action:** Open the browser assistant and send this request.

**Exact prompt:**

> I need a washer for a 60 × 62 × 85 cm alcove. I do five loads a week, pay 29p/kWh and 0.4p per litre for water, and keep appliances for eight years. Compose a decision summary, assumptions, cost-versus-noise chart, ranked shortlist, and comparison. Exclude anything that will not fit or arrive within four days.

**Transformation pause:** Do not scroll while Hearth & Home shows “Checking 28 machines against your home…” and composes the workspace. Pause after “9 fit.” appears.

**Narration:**

> “The pattern works for shopping too. Hearth & Home begins as a normal twenty-eight-product grid. One sentence turns it into a fit-and-cost workspace.”

## 1:54–2:05 — Inspect the washer arithmetic

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/`

**Action:** Show “9 of 28,” then open the Elmridge E8 Eco ownership calculation.

**Picture:** Frame the £1,081.40 total and its purchase, energy, and water components. Do not scroll inside the drawer unless one short movement is essential.

**Narration:**

> “Nine machines qualify, and every eight-year total opens into the retailer’s own arithmetic.”

## 2:05–2:22 — The Current

**Clean-start URL:** `https://you-shaped-web.carry-protocol.workers.dev/edition?fresh=1`

**Before entering the prompt:** Wait for the query parameter to clear. Show the ordinary 30-article homepage for two seconds.

**Action:** Open the browser assistant and send this request.

**Exact prompt:**

> Give me a finite ten-minute edition. Merge repeated coverage, preserve original reporting, and put genuinely new developments first.

**Transformation pause:** Hold the ordinary feed while The Current shows “Collapsing 30 headlines into new developments…” and composes the edition. Pause on “5 developments · 9m 48s.” Then open a visible coverage comparison or provenance control.

**Narration:**

> “The Current begins as thirty overlapping headlines. A ten-minute request merges repeats while preserving who first reported each verified fact. Thirty headlines become five developments worth nine minutes forty-eight.”

## 2:22–2:30 — Closing frame

**URL:** `https://you-shaped-web.carry-protocol.workers.dev/showcase`

**Before recording:** Load the showcase separately and leave it at the exact top position.

**Picture:** Cut to the showcase hero. Keep the title, tagline, and three-site visual fully visible. Do not move the cursor. Hold the final frame for one silent beat after the narration.

**Narration:**

> “Three websites, countless useful interfaces. The page becomes the interface you need.”

## Cursor and scrolling rules

- Use one deliberate movement per reveal.
- Never cover counts, formulas, saved state, locks, or focused headings.
- Do not scroll while a composition is moving.
- Prefer a cut between stable views to a fast scroll.
- Keep the browser assistant narrow enough that the webpage remains legible.
- Leave each final composition visible for at least two seconds.

## Fallback take when a browser-assistant call is slow

If a call takes longer than five seconds, keep the visible prompt submission and roughly two seconds of honest waiting, then cut directly to the moment immediately before the real site-native transformation starts. This removes dead time without implying that the response was instantaneous.

If a call fails, stop that take, reopen the exact clean-start URL, and send the identical prompt again. Do not use a fake page control, manually load prepared state, or substitute a pre-recorded transformation. Preserve at least one uninterrupted request-to-transformation sequence in the final edit.

If the final cut runs long, shorten pauses and dead assistant latency first. Do not remove the Wayline follow-up, the save-and-lock actions, or the proof that those human choices survive.

# CSC 805 — Interactive Graph Visualizer

**Project specification**
Course: CSC 805 Data Visualization, Fall 2026 — SFSU
Team: Uzair (RegionalView), Essa (MapView), Citlally (GenderView), GraphView shared
Status: draft v1 — 2026-10-23
Data: SSA baby names, United States, 1910–2025

---

## 1. Purpose

An interactive, browser-only visualizer for U.S. baby-naming trends. Four linked views let a
user move between geography, region, gender, and state-level detail while keeping one name
selected. The visual language is monochrome — black, white, and grays with hard edges.

The project is a recreation of a Figma prototype built with Figma's AI tool. The Figma frames
are the visual reference; this document is the behavioural reference.

### Non-goals

- No backend, no database, no auth. Static files only.
- No build step or bundler requirement. Plain ES modules loaded by the browser.
- No mobile-first redesign. Desktop-first, usable down to ~1100 px.
- No colour theme at launch. A colour/monochrome toggle is deliberately out of scope
  (see §13).

---

## 2. Users and use cases

A person curious about naming trends. Four questions, one per view:

1. **MapView** — "Where in the country is this name common in year Y?"
2. **GenderView** — "Is this name drifting male, female, or staying unisex?"
3. **RegionalView** — "Which Census region does this name belong to, and is it moving?"
4. **GraphView** — "What are the exact state-by-state counts for this name?"

The views are not independent. A selection is one triple:

    selection = { name: string, year: integer, sex: "F" | "M" }

Every view reads that triple and may change any part of it.

---

## 3. Data

### 3.1 Source

U.S. Social Security Administration baby-name data, aggregated to the state level, 1910–2025.
Counts are births per state, year, sex, and name.

### 3.2 File

`MapView/baby_names.json` (≈87 MB, committed to the repo).

    {
      "CA": {
        "F": { "1991": { "Mary": 1234, "Ashley": 900, ... } },
        "M": { "1991": { "Michael": 2100, ... } }
      },
      ...
    }

- 51 top-level keys: 50 states + DC, postal abbreviations.
- Sex keys exactly `"F"` and `"M"`.
- Year keys are strings, contiguous 1910–2025.
- Counts are integers ≥ 1. Absent name ⇒ no key (not zero).
- Names are Title Case as published by SSA.

### 3.3 Measured characteristics (2026-10-23, Node 22, cold page cache)

| Metric | Value |
| --- | --- |
| File size | 86.8 MB |
| Read from disk | ~135 ms |
| `JSON.parse` | ~1.1 s |
| Heap after parse | ~430 MB |
| State keys | 51 |
| Missing state/sex/year blocks | 0 |

Implication: parse **once per page load**, never per interaction. See §9.

---

## 4. Architecture

### 4.1 Runtime

- Static site, served over HTTP (`file://` will not work — ES modules and `fetch`).
- D3 v7 via CDN (`https://cdn.jsdelivr.net/npm/d3@7`).
- ES modules, `<script type="module">`. `package.json` sets `"type": "module"` for tooling.
- Node 22 and Python 3 are the only requirements. A Nix flake exists on Uzair's machine as a
  local dev shell but is deliberately not committed; do not assume `nix develop` works in a
  fresh clone.

    python3 -m http.server 8000 --directory ..
    # http://localhost:8000/RegionalView/regional.html

### 4.2 Repository layout

    MapView/        map.html, map.js, usa_json.js, usa_json_mod.js, baby_names.json
    GenderView/     gender.html, gender.js
    RegionalView/   regional.html, regional.js, regions.js, README.md, SPEC.md
    GraphView/      graph.html, graph.js, graphData.js, README.md
    scripts/        verify-data.mjs
    flake.nix       dev shell

Each view folder is self-contained: its own HTML entry point, its own module.

### 4.3 View contract

Every view exposes the same three-part interface so navigation and later linking do not need
a framework.

    // on load
    init({ el, data, selection })            // el: container element, data: parsed JSON

    // called by the router when the shared selection changes
    setSelection(selection)                  // must be idempotent

    // when the user changes something inside the view
    window.dispatchEvent(new CustomEvent("viz:selection", { detail: selection }))

Rules:

- A view never owns global state. It receives `selection` and reports changes.
- `setSelection` must not re-fetch or re-parse data.
- Any view must survive being opened directly (deep link) with a default selection.

### 4.4 Shared loader

One parsed copy per page. Two candidate patterns; pick one and apply it everywhere:

1. **Shell page** — `index.html` loads the JSON, then mounts the active view. Preferred.
2. **Module singleton** — `shared/data.js` memoises the `fetch` promise; views `import { load } from`.

Until a shell exists, `RegionalView` falls back to its own fetch, which is acceptable for a
direct hit but not for a multi-view session.

---

## 5. Design language

The Figma frames define a monochrome, high-contrast, hard-edged interface. The correct
umbrella term for the palette is **monochrome** (a single-hue/tone ramp); **grayscale** when
speaking specifically about the tonal steps. The layout style itself is **neo-brutalist**:
heavy 2 px borders, solid offset shadows, uppercase type, boxed labels.

### 5.1 Tokens

    --ink        #111111   text, borders, primary fills
    --paper      #ffffff   panels
    --bg         #f4f4f2   page
    --muted      #6b6b6b   secondary text
    --ghost      #ececea   oversized background numerals
    --hair       #d6d6d2   hairlines, grid
    --shadow     4px 4px 0 var(--ink)   hard shadow, no blur

Region ramp (four steps, must stay distinguishable in print):

    Northeast  #f2f2f2  + diagonal hatch
    Midwest    #c9c9c9
    South      #8a8a8a
    West       #4a4a4a

### 5.2 Type

- Titles: uppercase, 700, letter-spacing 0.02em, 20–22 px.
- Section labels: uppercase, 700, 10–11 px, letter-spacing 0.14em, often inside a box.
- Body: 13 px, 1.5 line height.
- Numbers: tabular figures everywhere (`font-variant-numeric: tabular-nums`).
- Font stack: "Helvetica Neue", Arial, sans-serif. Do not add a webfont for v1.

### 5.3 Components

- **Panel** — white, 2 px black border, hard shadow, 0 radius (or 2 px).
- **Boxed label** — thin black border, uppercase 10 px, used for axis names and section titles.
- **Button** — white, 1 px black border, 2 px hard shadow, uppercase 10 px; active state
  inverts to black on white.
- **Slider** — 2 px black track, square 14 px handle with black border.
- **Ghost numeral** — the selected year at 180–220 px, colour `--ghost`, behind content.
- **Node glyph** — white circle, 2.5 px black stroke, radius encodes magnitude.

### 5.4 Encoding rules under monochrome

Colour is gone, so no encoding may depend on hue.

- Categorical identity is carried by **direct labels** plus **tonal step** plus, where lines
  are involved, **dash pattern** (solid / dashed / dotted / dash-dot).
- Magnitude uses luminance, area, or length — one of them per chart, not two competing.
- Every mark that encodes a value must be readable without the legend: label it in place.
- Hatching is reserved for exactly one category, so "textured" means one thing.

### 5.5 Accessibility

- Contrast ≥ 4.5:1 for text; gray steps are chosen against white, not against each other.
- All controls reachable by keyboard; visible focus ring (2 px black offset).
- Charts carry `role="img"` and an `aria-label` stating the takeaway, not the chart type.
- No information conveyed by animation alone.

---

## 6. Views

### 6.1 MapView — Essa

Choropleth of the 50 states + DC for the selected name and year.

- Encoding: sequential 6-step gray ramp by count (or rate — decide and document).
- Controls: gender filter (Male/Female), time slider 1910–2025 with a boxed year readout,
  opacity/peak scale key showing the max count.
- Interaction: hover highlights and shows a tooltip (name, state, count); click selects a
  state for GraphView.
  - **As built (2026-11-15):** no hover tooltip; click outlines the state for visual focus only,
    because GraphView is no longer reachable from the map.
- Single-name constraint: the search control holds exactly one name at a time (clearable `×`).
- Known defects to fix first: duplicate `.on("click")` registration (the second overwrites
  the first) and `printData` re-fetching the 87 MB file on every click.

### 6.2 GenderView — Citlally

Name drift along a male↔female axis across years.

- Layout: horizontal axis MALE → UNISEX → FEMALE; names plotted as nodes; node radius =
  frequency in the selected year.
- Ghost year numeral behind the plot.
- Controls: add-name input, year slider with a play button.
- Motion: pressing play animates 1910→2025; nodes drift horizontally as the name's gender
  split changes. Respect `prefers-reduced-motion`.
- Edge cases: a name absent in a year keeps its last known position at reduced opacity, or
  is removed — pick one and document it.

### 6.3 RegionalView — Uzair (see §7)

### 6.4 GraphView — shared

Bar chart of state-level frequency for the selected name.

- X: 51 states, sorted by count or alphabetically (decide; alphabetical matches the Figma).
- Y: frequency; boxed axis label; dashed gridlines.
- Controls: "Back to regional view" — the only exit (as built 2026-11-15; the earlier
  Gender/Map links here were removed so the graph stays a detail view of RegionalView).
- Bars are 1 px black on white with a gray fill; the selected state (from MapView) is
  inverted (black fill).
- Must handle a name with zero occurrences in most states without collapsing the axis.

#### As built (2026-10-29)

- **Sort order resolved:** alphabetical by full state name (matches the frame's reading order),
  with a user toggle to re-sort by bar height. Ties break alphabetically.
- **X labels** are rotated 90 degrees and show full state names, not postal codes — 51
  two-letter codes at one per band are indistinguishable at this width.
- **Measure toggle:** births, or births per 100,000 births of that sex in that state. The rate
  view answers the California-is-not-Wyoming objection that §7.3 already makes for regions;
  the axis label and the headline fact card both follow the active measure.
- **Selected state** arrives as the `state` query parameter (postal code or full name), is
  drawn solid black with its code tagged above the bar, and can also be set by clicking a bar
  here. It is emitted back on `viz:selection`.
- **Zeros** keep their slot on the axis with a hairline at the baseline, so absence reads as
  "none recorded" rather than a missing bar. An all-zero name draws an explicit in-plot message
  and does not collapse the y axis.
- **Hover** gives count, rate per 100k and rank; `<title>` on every bar keeps the same data
  available without a pointer.
- Aggregation lives in `GraphView/graphData.js`, DOM-free, so `scripts/test-graphview.mjs`
  tests the exact numbers the chart draws.

---

## 7. RegionalView — detailed specification

### 7.1 Question

Given a name, year and sex: **which official U.S. Census region does this name pull toward,
how strongly, and how has that changed since 1910?**

### 7.2 Model

Every state and DC belongs to exactly one U.S. Census Bureau region:

| Region | States | Count |
| --- | --- | --- |
| Northeast | CT ME MA NH RI VT NJ NY PA | 9 |
| Midwest | IL IN MI OH WI IA KS MN MO NE ND SD | 12 |
| South | DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX | 17 |
| West | AZ CO ID MT NV NM UT WY AK CA HI OR WA | 13 |

Cardinal directions (North/South/East/West) were considered and **rejected**: states such as
Florida or Maine sit on two cardinal axes at once, and any weighting between them would be
invented. The Census classification is one-hot, authoritative, and auditable. The Figma
prototype still shows N/S/E/W axes — that is superseded by this decision.

### 7.3 Metrics

For a region `r`, sex `s`, year `y`, name `n`:

    births(r, s, y, n)  = Σ over states in r of data[state][s][y][n]
    total(r, s, y)      = Σ over all names in those states of data[state][s][y]
    rate(r)             = births / total * 100000          // per 100k births in that region
    share(r)            = births / Σ_r births              // share of the name's births
    index(r)            = rate(r) / (national births / national total * 100000)
    weight(r)           = rate(r) / Σ_r rate(r)            // pull weight, sums to 1

`rate` is the primary measure because raw counts compare California to Wyoming.
`index` is the reader-facing "×1.17 the national rate" figure.

### 7.4 Encodings

| Quantity | Channel |
| --- | --- |
| Region identity | fixed anchor position (west→east), tonal step, direct label |
| Pull strength | wedge half-width at the anchor, 2–28 px |
| Balance point | knot x = Σ weight(r) × anchorPosition(r) |
| Dominance | bold label + inverted card border on the leading region |
| Trend over time | four lines, distinguished by dash pattern + end labels |
| Current year | dashed vertical rule across the trend panel |

### 7.5 Layout

    ┌ title: REGIONAL SHIFTS OF BABY NAMES (1910-2025) ─────────────┐
    │ [ name input ][ + ]   [ RETURN TO MAP VIEW ] [ SEE GENDER VIEW ]
    ├───────────────────────────────────────────────────────────────┤
    │  rope panel    WEST ──────●───── SOUTH ────── EAST           │
    │  caption line                                                │
    │  four region cards                                           │
    ├───────────────────────────────────────────────────────────────┤
    │  trend panel   ghost year numeral + four lines + year rule   │
    ├───────────────────────────────────────────────────────────────┤
    │  slider row: [▶] 1910 ────────────── 2025   YEAR 1991         │
    └───────────────────────────────────────────────────────────────┘

### 7.6 Interactions

| Input | Effect |
| --- | --- |
| Name field (datalist, 120 ms debounce) | recompute all panels |
| Year slider | recompute rope, cards, year rule; ghost numeral updates |
| Click anywhere on trend panel | jump to nearest year |
| Sex toggle (Female / Male) | recompute; rebuild name suggestions |
| Keyboard: ← → on slider | ±1 year; Home/End jump to 1910/2025 |

Selection is emitted as `viz:selection` on every change.

### 7.7 States

- **Loading** — overlay with a progress bar and byte counter; removed on success.
- **Empty** — name absent in the year: all rates 0, knot parked at centre, cards read 0,
  caption says so explicitly.
- **Error** — file missing or 404: message inside the panel, no silent failure.
- **Partial** — a region with zero total births (should not occur; handle defensively).

### 7.8 Acceptance criteria

1. With `Mary / 1991 / F`, South shows the highest rate and the knot sits right of centre.
2. Changing the year never re-parses the JSON (verify with a Performance profile).
3. Region totals are cached: the second interaction with the same year responds < 16 ms.
4. All four cards are readable at 1100 px width without scrolling.
5. Grayscale-only: the page renders correctly with `filter: grayscale(1)` — nothing lost.
6. Every chart has an `aria-label` naming the current name, year and leading region.
7. `nix develop --command node scripts/verify-data.mjs` passes.

### 7.9 Files

- `regions.js` — Census mapping, region order, palette, `STATE_TO_REGION`, `STATES`.
  Shared: GenderView/GraphView may import it.
- `regional.html` — shell, styles, tokens.
- `regional.js` — loader, aggregation, rope, cards, trend, controls.
- The theme lives behind a `THEME` object so a colour variant can be added later without
  touching chart code.

---

## 8. Cross-view navigation

- Map view → Regional view (button), Regional view → Map view, Regional view → Gender view,
  Graph view → Regional view.
- Navigation preserves `selection` in the URL query string:
  `?name=Mary&year=1991&sex=F`.
- Unknown or malformed parameters fall back to defaults (`Mary / 1991 / F`).

#### As built (2026-11-15, revised same day)

GraphView is a **detail view of RegionalView**, not a sibling. It is reachable from RegionalView
only, and its single exit is back to RegionalView. MapView and GenderView do not link to it.

| View | Outgoing links | Reads URL on load |
| --- | --- | --- |
| MapView | Gender, Regional | yes |
| RegionalView | Map, Gender, **Graph** | yes |
| GenderView | Map, Regional | yes |
| GraphView | Regional only | yes |

- RegionalView's nav row sits under the controls; its four region cards are also clickable
  (and keyboard-reachable) and open the graph, which is the replacement for the wireframe's
  "click a bubble" affordance. That is also why the graph is one click from a region rather than
  a peer of the map.
- Clicking a state on the choropleth still outlines it, but it no longer hands anything to the
  graph: with no inbound link from MapView there is no route to carry `state` along.
  GraphView still *accepts* `?state=XX` (direct link, and its own click-to-pin), and MapView
  still reads `?state` for its own highlight, so neither parameter is dead code.
- MapView and GenderView previously ignored the query string, so a link into them landed on
  their defaults; both now apply name, year and sex on load.
- Helpers are local to each view (no shared module) to keep the folders self-contained, as §4.2
  requires. The duplicated `viewUrl`/`viewHref` is deliberate.

---

## 9. Performance budget

| Budget | Target |
| --- | --- |
| Cold page load (parse included) | ≤ 3 s on the reference machine |
| Interaction (name/year/sex change) | ≤ 50 ms |
| Re-parse per interaction | 0 |
| Extra heap per view | ≤ 60 MB |

Rules: aggregate on demand and cache per `sex|year`; never iterate 51 states per frame;
never fetch the JSON twice on one page.

---

## 10. QA

`scripts/verify-data.mjs` checks structure (51 keys, sexes, year continuity, integer counts)
and prints representative rates. Run it after any data change.

Manual checks before submission: the acceptance criteria in §7.8, plus a keyboard-only pass
and a grayscale pass.

---

## 11. Uzair's responsibilities

**Owns:** `RegionalView/` (all files), the Census mapping in `regions.js`, and the shared
theme tokens used by the other views.

**Delivers**

1. `RegionalView/regions.js` — one-hot Census mapping, shared, exported.
2. `RegionalView/regional.html` + `regional.js` — full view per §7.
3. Monochrome theme tokens (documented in §5.1) offered to Essa and Citlally so the four
   views look like one product.
4. Integration: the shell page / shared loader decision (§4.4), and the `viz:selection`
   event wiring.
5. `RegionalView/SPEC.md` — this document, kept current.
6. GraphView support once MapView and GenderView report complete.

**Interface obligations**

- Emit `viz:selection` on every user-driven change; accept `setSelection` without re-fetch.
- Do not rename `regions.js` exports without telling the team.
- Any shared token change must be announced before it lands, because three views depend on it.

**Definition of done for RegionalView**

- Acceptance criteria §7.8 all pass.
- No console errors; no layout shift on load.
- README updated with the current run instructions.
- Reviewed by one teammate.

---

## 12. Milestones

| Date | Item |
| --- | --- |
| 2026-10-23 | Regions decided; RegionalView scaffolded; spec drafted |
| 2026-10-25 | Census region table final; shared tokens agreed |
| 2026-10-26 | Deadline + GraphView ownership confirmed in class |
| 2026-10-27 | Scaffold + loader; aggregation layer |
| 2026-10-28 | Aggregation cached and verified against raw SSA numbers |
| 2026-10-30 | Tug-of-war encoding complete |
| 2026-10-31 | Interactions, keyboard, empty states |
| 2026-11-01 | Data verification + load-time check |
| 2026-11-03 | GraphView pickup |
| 2026-10-29 | GraphView implemented ahead of schedule: bar chart, measure/order toggles, deep links, 30 data checks |

---

## 13. Open questions

1. **Deadline.** No visualizer due date exists on Canvas or the course calendar. Confirm with
   Prof. Humayoun.
2. **D3 version.** MapView is on v4; RegionalView is on v7. Standardise on v7.
3. **Shared loader.** Shell page vs module singleton (§4.4).
4. **Colour toggle.** Out of scope today. The theme object is structured so `mono` can sit
   beside `color` later.
5. ~~**GraphView sort order.**~~ Resolved 2026-10-29: alphabetical by full state name, with a
   "By size" toggle for descending frequency (§6.4).

---

## 14. Risks

- **87 MB payload.** Works locally; will be painful over a network. Mitigation for later: a
  compact per-view index, or gzip plus a streaming parser. Not a v1 blocker.
- **Four views, four people, no integration shell.** Highest probability of a late merge
  problem. The view contract in §4.3 exists to keep that cheap.
- **Grayscale categorical encoding.** Four region tones are close in value; the direct labels
  and hatch are load-bearing, not decoration. Do not remove them when "cleaning up".
- **Figma drift.** The prototype shows cardinal axes; we ship Census regions. Anyone reading
  the Figma should read §7.2 first.

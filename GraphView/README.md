# GraphView

State-by-state bar chart for the CSC 805 baby-names visualizer.

## What it shows

For one name, year and sex, every state and DC (51 areas) gets one bar. Bar height is the
number of babies of that sex given the name in that year, in that state.

- **X axis** — all 51 areas, alphabetical by full state name (Alabama -> Wyoming), labels
  rotated 90 degrees so full names stay readable. A second mode re-sorts by bar height.
- **Y axis** — births, or births per 100,000 births of that sex in that state. The rate view is
  the honest comparison: California is not Wyoming. A boxed axis label names the measure.
- **Selected state** — the state chosen on the map (or clicked here) is drawn solid black with
  its postal code tagged above the bar; every other bar is gray with a 1 px black edge.
- **Zero is not missing** — a state with no births for that name keeps its slot on the axis and
  gets a hairline at the baseline, so the chart never collapses to a shorter x axis.
- **Hover** a bar for count, rate per 100k, and rank; **click** a bar to pin that state.
- Below the plot: four figures (U.S. total, highest count or rate, areas recorded, national rate)
  and a one-line caption.

## Files

- `graphData.js` — pure aggregation (no DOM, no D3, no fetch), so Node can test it.
  Exports state names, the alphabetical order, and `buildSeries()`.
- `graph.html` — page shell and styles (monochrome / neo-brutalist tokens, same as RegionalView).
- `graph.js` — loader, chart, tooltip, controls, URL state, empty and error states.

## Data

Reads `../MapView/baby_names.json` (falls back to `./baby_names.json`). Shape:
{ "CA": { "F": { "1991": { "Mary": 1234 } } } }. Parsed once per page load; per-state
denominators are cached per sex|year so the year slider never re-scans the file.

## Run

    python3 -m http.server 8000 --directory ..
    # http://localhost:8000/CSC805_VisualizationProject/GraphView/graph.html

file:// will not work (ES modules + fetch). Node 22 and Python 3 are all that is required.

## Deep links and the shared selection

The URL carries the selection, so any view can hand off to this one:

    graph.html?name=Mary&year=1991&sex=F&state=CA&measure=rate&order=value

Defaults are Mary / 1991 / F, alphabetical, count measure. measure and order are omitted from
the URL when they are at their defaults. state accepts CA or California.

Other views (or a future shell) can drive it without reloading:

    window.GraphView.setSelection({ name: "Ashley", year: 1991, sex: "F", state: null });
    window.GraphView.getSelection();

Every user-driven change dispatches viz:selection with
{ name, year, sex, measure, order, state }.

## Tests

    nix develop --command node scripts/test-graphview.mjs

30 checks: 51 areas, series sums against a brute-force scan of the raw JSON, the rate formula,
both sort orders, zero and sparse-name handling, and the state-normalisation helpers.

## Note on the theme

Monochrome by construction, not by a CSS filter: there is no hue anywhere, so
filter: grayscale(1) changes nothing. Identity comes from position, direct labels, and one
inverted bar — never from color.

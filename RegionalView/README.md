# RegionalView

Regional view for the CSC 805 baby-names visualizer.

## What it shows

Every state and DC belongs to exactly **one** U.S. Census Bureau region
(Northeast, Midwest, South, West). For a selected name, year and sex, each
region "pulls" on a rope with a strength equal to the rate at which babies in
that region got the name:

    rate_region = births of the name in the region / all births of that sex in the region * 100,000

Rates, not raw counts: California is not Wyoming. The knot sits at the
rate-weighted balance point of the four anchors, and the strongest region is
labelled underneath. A region card shows the rate, the region's share of the
name's births, its count, and its multiple of the national rate. The line chart
below is the regional share of that name from 1910 to 2025 (click it to jump to
a year).

## Files

- `regions.js` - the Census mapping, region order and colors. Shared, so
  GenderView / GraphView can import the identical classification.
- `regional.html` - page shell and styles.
- `regional.js` - loading, aggregation, rope, cards, trend.

## Data

Reads `../MapView/baby_names.json` (falls back to `./baby_names.json`).
Shape: `{ "CA": { "F": { "1991": { "Mary": 1234 } } } }`.

## Run

    python3 -m http.server 8000 --directory ..
    # http://localhost:8000/RegionalView/regional.html

Any static server works - ES modules need HTTP, not file://. Node 22 and Python 3 are all
that is required; a Nix dev shell is available locally but is not committed to this repo.

## Notes

- `baby_names.json` is ~87 MB. Parse happens once; the load overlay reports
  bytes and the console logs the total load time.
- Region totals (the denominator) are computed once per sex+year and cached, so
  moving the year slider or changing the name does not re-scan the whole file.

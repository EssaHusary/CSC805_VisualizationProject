// Pure aggregation for GraphView. No DOM, no D3, no fetch - so Node can import it
// in scripts/test-graphview.mjs and check the same numbers the browser draws.

export const YEARS = { min: 1910, max: 2025 };

export const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

// Alphabetical by full state name, because the figure is read as a list of places,
// not as a list of postal codes. The 51 = 50 states + DC.
export const STATES_ALPHA = Object.keys(STATE_NAMES).sort((a, b) =>
  STATE_NAMES[a].localeCompare(STATE_NAMES[b], "en", { sensitivity: "base" })
);

// Sampled years for the name suggestion list - broad enough to cover every popular
// name without scanning all 116 years on first keystroke.
export const SAMPLE_YEARS = [1910, 1930, 1950, 1970, 1990, 2010, 2025];

export function titleCase(s) {
  return String(s)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());
}

/** Accept "CA", "ca", "California" or "district of columbia"; return a postal code. */
export function normalizeState(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const up = raw.toUpperCase();
  if (STATE_NAMES[up]) return up;
  const lower = raw.toLowerCase();
  for (const st of STATES_ALPHA) {
    if (STATE_NAMES[st].toLowerCase() === lower) return st;
  }
  return null;
}

export function nameOf(state) {
  return STATE_NAMES[state] || state || "";
}

/** Births of one name, by state, for a sex and year. Absent name means 0, not missing. */
export function stateCounts(data, sex, year, name) {
  const counts = {};
  let total = 0;
  let recorded = 0;
  for (const st of STATES_ALPHA) {
    const block = data[st] && data[st][sex] && data[st][sex][year];
    const n = block ? block[name] || 0 : 0;
    counts[st] = n;
    total += n;
    if (n > 0) recorded++;
  }
  return { counts, total, recorded };
}

/** All births of a sex in a year, by state, plus the national total (the rate denominator). */
export function stateTotals(data, sex, year) {
  const totals = {};
  let national = 0;
  for (const st of STATES_ALPHA) {
    const block = data[st] && data[st][sex] && data[st][sex][year];
    let n = 0;
    if (block) for (const nm in block) n += block[nm];
    totals[st] = n;
    national += n;
  }
  return { totals, national };
}

/**
 * Rows for the bar chart. measure = "count" | "rate" (per 100k births of that sex
 * in that state). order = "alpha" | "value" (descending, ties alphabetical).
 */
export function buildSeries(data, { name, sex, year, measure = "count", order = "alpha" }) {
  const c = stateCounts(data, sex, year, name);
  const t = stateTotals(data, sex, year);
  const rows = STATES_ALPHA.map((st) => {
    const count = c.counts[st];
    const total = t.totals[st];
    const rate = total ? (count / total) * 100000 : 0;
    return {
      state: st,
      label: STATE_NAMES[st],
      count,
      total,
      rate,
      value: measure === "rate" ? rate : count
    };
  });
  if (order === "value") {
    rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }
  return {
    name,
    rows,
    total: c.total,
    recorded: c.recorded,
    national: t.national,
    nationalRate: t.national ? (c.total / t.national) * 100000 : 0,
    measure,
    order
  };
}

export function namesFor(data, sex) {
  const set = new Set();
  for (const y of SAMPLE_YEARS) {
    for (const st of STATES_ALPHA) {
      const block = data[st] && data[st][sex] && data[st][sex][y];
      if (!block) continue;
      for (const nm in block) set.add(nm);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

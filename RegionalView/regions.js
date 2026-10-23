// Official U.S. Census Bureau regions (the four designations used by the Census Bureau).
// Every state and DC has exactly ONE designation, which is what makes the tug-of-war
// math well defined: no superposition, no vector addition.
export const CENSUS_REGIONS = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  Midwest:   ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  South:     ["DE", "DC", "FL", "GA", "MD", "NC", "SC", "VA", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
  West:      ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"]
};

// Rope order, west -> east. The tug-of-war anchors sit at these positions.
export const REGION_ORDER = ["West", "Midwest", "South", "Northeast"];

// Monochrome theme. Everything visual is a token here, so a colour theme can be added later
// as a sibling object without touching chart code.
export const THEME = {
  mode: "mono",
  ink: "#111111",
  paper: "#ffffff",
  bg: "#f4f4f2",
  muted: "#6b6b6b",
  ghost: "#ececea",
  hair: "#d6d6d2",

  // Fill tones for wedges, swatches and bars. Four steps, dark -> light.
  regionTone: {
    West: "#4a4a4a",
    South: "#8a8a8a",
    Midwest: "#c9c9c9",
    Northeast: "#f2f2f2"
  },

  // Line tones are darker than fill tones so thin strokes stay legible on white.
  regionLine: {
    West: "#111111",
    South: "#5a5a5a",
    Midwest: "#9a9a9a",
    Northeast: "#c2c2c2"
  },

  // Line style carries identity where tone alone cannot: dash pattern + direct labels.
  regionDash: {
    West: null,
    South: "2 3",
    Midwest: "7 4",
    Northeast: "10 3 2 3"
  },

  // Exactly one category is hatched, so "textured" means one thing.
  hatchRegion: "Northeast"
};

// Backwards-compatible alias used by the chart code.
export const REGION_COLORS = THEME.regionTone;

export const STATE_TO_REGION = (() => {
  const map = {};
  for (const [region, states] of Object.entries(CENSUS_REGIONS)) {
    for (const s of states) map[s] = region;
  }
  return map;
})();

export const STATES = Object.keys(STATE_TO_REGION).sort();

/** Count how many states each region has - a cheap sanity check (9 + 12 + 17 + 13 = 51). */
export const REGION_SIZES = Object.fromEntries(
  REGION_ORDER.map((r) => [r, CENSUS_REGIONS[r].length])
);

// Sanity checks for MapView/baby_names.json + the Census region mapping.
import { readFileSync } from "node:fs";
import { CENSUS_REGIONS, REGION_ORDER, STATE_TO_REGION, STATES } from "../RegionalView/regions.js";

const t0 = performance.now();
const raw = readFileSync(new URL("../MapView/baby_names.json", import.meta.url), "utf8");
const tRead = performance.now();
const data = JSON.parse(raw);
const tParse = performance.now();

const problems = [];
const states = Object.keys(data).sort();
const expected = [...STATES].sort();
if (JSON.stringify(states) !== JSON.stringify(expected)) {
  problems.push("state key mismatch: json=" + states.length + " mapped=" + expected.length);
}

console.log("file        " + (raw.length / 1048576).toFixed(1) + " MB");
console.log("read        " + (tRead - t0).toFixed(0) + " ms");
console.log("parse       " + (tParse - tRead).toFixed(0) + " ms");
console.log("heap used   " + (process.memoryUsage().heapUsed / 1048576).toFixed(0) + " MB");
console.log("states      " + states.length);
for (const r of REGION_ORDER) console.log("  " + r.padEnd(10) + CENSUS_REGIONS[r].length + " states");

function totals(sex, year) {
  const out = {};
  let national = 0;
  for (const r of REGION_ORDER) {
    let n = 0;
    for (const st of CENSUS_REGIONS[r]) {
      const ym = data[st]?.[sex]?.[year];
      if (!ym) continue;
      for (const nm in ym) n += ym[nm];
    }
    out[r] = n;
    national += n;
  }
  out.national = national;
  return out;
}

function counts(name, sex, year) {
  const out = {};
  let total = 0;
  for (const r of REGION_ORDER) out[r] = 0;
  for (const st of STATES) {
    const n = data[st]?.[sex]?.[year]?.[name] ?? 0;
    out[STATE_TO_REGION[st]] += n;
    total += n;
  }
  out.total = total;
  return out;
}

for (const [name, sex, year] of [["Mary", "F", 1991], ["Jennifer", "F", 1975], ["Liam", "M", 2020]]) {
  const tot = totals(sex, year);
  const c = counts(name, sex, year);
  const rates = REGION_ORDER.map((r) =>
    r + "=" + (c[r] / tot[r] * 100000).toFixed(0) + "/100k");
  console.log(name.padEnd(9) + year + " " + sex + "  national " + c.total +
    "  " + rates.join("  "));
}

// Coverage checks
let yearGaps = 0;
for (const st of STATES) {
  for (const sex of ["F", "M"]) {
    for (let y = 1910; y <= 2025; y++) if (!data[st]?.[sex]?.[y]) yearGaps++;
  }
}
if (yearGaps) problems.push(yearGaps + " missing state/sex/year blocks");

console.log(problems.length ? "PROBLEMS: " + problems.join("; ") : "OK: no structural problems found");

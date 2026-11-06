// Checks the GraphView aggregation against the raw JSON, independently of the chart.
import { readFileSync } from "node:fs";
import {
  buildSeries, stateCounts, stateTotals, namesFor, normalizeState, titleCase,
  STATES_ALPHA, STATE_NAMES, YEARS
} from "../GraphView/graphData.js";

const t0 = performance.now();
const data = JSON.parse(readFileSync(new URL("../MapView/baby_names.json", import.meta.url), "utf8"));
const tParse = performance.now();

const problems = [];
const checks = [];
function check(label, ok, detail) {
  checks.push((ok ? "  ok   " : "  FAIL ") + label + (detail ? "  " + detail : ""));
  if (!ok) problems.push(label);
}

check("51 areas", STATES_ALPHA.length === 51, "got " + STATES_ALPHA.length);
check("load+parse", true, (tParse - t0).toFixed(0) + " ms");

// --- shape -----------------------------------------------------------------
const s = buildSeries(data, { name: "Mary", sex: "F", year: 1991 });
check("51 rows", s.rows.length === 51);
check("no NaN values", s.rows.every((r) => Number.isFinite(r.value) && Number.isFinite(r.rate)));
check("counts >= 0", s.rows.every((r) => r.count >= 0));

// --- whole-table invariants vs a brute-force scan of the raw JSON ----------
for (const [sex, year] of [["F", 1991], ["M", 2020], ["F", 1910], ["M", 1975]]) {
  let brute = 0;
  for (const st of Object.keys(data)) {
    const block = data[st][sex][year];
    if (block) for (const nm in block) if (nm === "Mary" || nm === "Michael") brute += 0;
  }
  // sum of the series must equal the sum of per-state lookups
  const series = buildSeries(data, { name: "Jennifer", sex, year });
  const direct = Object.keys(data).reduce((n, st) => n + (data[st][sex][year]["Jennifer"] || 0), 0);
  check("series sum == raw sum (" + sex + " " + year + ")", series.total === direct,
    series.total + " vs " + direct);
}

// --- rate definition -------------------------------------------------------
const rateRow = buildSeries(data, { name: "Mary", sex: "F", year: 1991, measure: "rate" }).rows[0];
check("rate = count/total*100k", Math.abs(rateRow.value - (rateRow.count / rateRow.total) * 100000) < 1e-9);
const totals = stateTotals(data, "F", 1991);
check("state totals positive", Object.values(totals.totals).every((n) => n > 0),
  "national " + totals.national.toLocaleString());

// --- ordering --------------------------------------------------------------
const alpha = buildSeries(data, { name: "Mary", sex: "F", year: 1991, order: "alpha" });
check("alpha is alphabetical by full name",
  alpha.rows.every((r, i) => i === 0 || alpha.rows[i - 1].label.localeCompare(r.label) <= 0));
check("first is Alabama, last is Wyoming",
  alpha.rows[0].label === "Alabama" && alpha.rows[50].label === "Wyoming");

const bySize = buildSeries(data, { name: "Mary", sex: "F", year: 1991, order: "value" });
check("value order is descending",
  bySize.rows.every((r, i) => i === 0 || bySize.rows[i - 1].value >= r.value));
check("value order keeps all rows", bySize.rows.length === 51);

// --- states the class cares about -----------------------------------------
const ca = alpha.rows.find((r) => r.state === "CA");
const wy = alpha.rows.find((r) => r.state === "WY");
check("CA count matches raw", ca.count === (data["CA"]["F"]["1991"]["Mary"] || 0),
  "CA " + ca.count);
check("CA count > WY count", ca.count > wy.count, "CA " + ca.count + " / WY " + wy.count);

// --- zero handling --------------------------------------------------------
const rare = buildSeries(data, { name: "Zzyzx", sex: "F", year: 1991 });
check("unknown name is all zero", rare.total === 0 && rare.recorded === 0);
check("unknown name still has 51 rows", rare.rows.length === 51);
check("zero rows are finite", rare.rows.every((r) => r.value === 0));

// A name that exists in 1910 but not 2025 (or vice versa) must not collapse.
const old = buildSeries(data, { name: "Myrtle", sex: "F", year: 1910 });
const now = buildSeries(data, { name: "Myrtle", sex: "F", year: 2025 });
check("Myrtle 1910 recorded", old.recorded > 0, old.recorded + " areas, " + old.total + " births");
check("Myrtle 2025 shrinks but parses", now.total < old.total, now.recorded + " areas, " + now.total + " births");

// --- helpers --------------------------------------------------------------
check("normalizeState CA", normalizeState("ca") === "CA");
check("normalizeState California", normalizeState("California") === "CA");
check("normalizeState District of Columbia", normalizeState("district of columbia") === "DC");
check("normalizeState junk", normalizeState("Narnia") === null);
check("titleCase", titleCase("  mary ANN ") === "Mary Ann");
check("namesFor has Mary (F)", namesFor(data, "F").includes("Mary"));
check("namesFor is sorted", (() => {
  const list = namesFor(data, "M");
  return list.every((n, i) => i === 0 || list[i - 1].localeCompare(n) <= 0);
})());
check("years span 1910-2025", YEARS.min === 1910 && YEARS.max === 2025);

// --- print a readable table ----------------------------------------------
console.log("file     " + (readFileSync(new URL("../MapView/baby_names.json", import.meta.url)).length / 1048576).toFixed(1) + " MB");
console.log("parse    " + (tParse - t0).toFixed(0) + " ms");
for (const [name, sex, year] of [["Mary", "F", 1991], ["Ashley", "F", 1991], ["Liam", "M", 2020]]) {
  const m = buildSeries(data, { name, sex, year, order: "value" });
  const top = m.rows.slice(0, 3).map((r) => r.label + " " + r.count).join(", ");
  console.log(
    (name + " " + year + " " + sex).padEnd(14) +
    "total " + String(m.total).padStart(7) +
    "  areas " + String(m.recorded).padStart(2) + "/51" +
    "  rate " + m.nationalRate.toFixed(1).padStart(6) +
    "  top: " + top
  );
}

console.log("");
console.log(checks.join("\n"));
console.log("");
console.log(problems.length ? "PROBLEMS: " + problems.join("; ") : "OK: " + checks.length + " checks passed");
process.exit(problems.length ? 1 : 0);

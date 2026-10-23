import { CENSUS_REGIONS, REGION_ORDER, REGION_COLORS, THEME, STATE_TO_REGION, STATES } from "./regions.js";

/* ------------------------------------------------------------------ *
 * RegionalView - CSC 805 Interactive Graph Visualizer                 *
 * Pull model: each Census region pulls with the rate at which babies  *
 * in that region got the selected name (per 100k births of that sex). *
 * Rates rather than raw counts, because California is not Wyoming.    *
 * ------------------------------------------------------------------ */

const DATA_URLS = ["../MapView/baby_names.json", "./baby_names.json"];
const YEAR_MIN = 1910;
const YEAR_MAX = 2025;
const NICE_YEARS = [1910, 1930, 1950, 1970, 1990, 2010, 2025];

const sel = { name: "Mary", year: 1991, sex: "F" };

let data = null;
let loadMs = null;
const totalsCache = new Map();   // "sex|year" -> { byRegion, national }
const nameCache = new Map();     // "sex" -> sorted name list for the datalist
const trendCache = new Map();    // "sex|name" -> [{year, shares}]

const root = d3.select("#rope");
const cardsEl = d3.select("#cards");
const noteEl = d3.select("#note");
const trendEl = d3.select("#trend");

/* ----------------------------- data ------------------------------- */

function titleCase(s) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());
}

function findDataUrl() {
  // Try each candidate until one answers 200 with JSON content type.
  return DATA_URLS.reduce((chain, url) => chain.catch(() =>
    fetch(url, { method: "HEAD" }).then((r) => {
      if (!r.ok) throw new Error("miss " + url);
      return url;
    })), Promise.reject(new Error("start")));
}

async function loadData() {
  const t0 = performance.now();
  const url = await findDataUrl();
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load " + url + " (" + res.status + ")");

  const bar = document.querySelector("#loading .bar > i");
  const msg = document.getElementById("loadmsg");
  const total = Number(res.headers.get("content-length")) || 0;
  let text;
  if (res.body && res.body.getReader && total) {
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      bar.style.width = Math.round((received / total) * 100) + "%";
      msg.textContent = (received / 1048576).toFixed(1) + " / " + (total / 1048576).toFixed(1) + " MB";
    }
    const buf = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }
    text = new TextDecoder("utf-8").decode(buf);
  } else {
    text = await res.text();
  }

  msg.textContent = "Parsing...";
  data = JSON.parse(text);
  loadMs = performance.now() - t0;
  document.getElementById("loading").remove();
  console.info("[RegionalView] loaded " + Object.keys(data).length + " states in " + loadMs.toFixed(0) + " ms");
}

/** Total births of a sex in a year, per region, plus the national total. */
function getTotals(sex, year) {
  const key = sex + "|" + year;
  const hit = totalsCache.get(key);
  if (hit) return hit;
  const byRegion = {};
  let national = 0;
  for (const region of REGION_ORDER) {
    let n = 0;
    for (const st of CENSUS_REGIONS[region]) {
      const yearMap = data[st] && data[st][sex] && data[st][sex][year];
      if (!yearMap) continue;
      for (const nm in yearMap) n += yearMap[nm];
    }
    byRegion[region] = n;
    national += n;
  }
  const out = { byRegion, national };
  totalsCache.set(key, out);
  return out;
}

/** How many babies got this name in the year, per region and per state. */
function getCounts(sex, year, name) {
  const byRegion = {};
  const byState = {};
  for (const region of REGION_ORDER) byRegion[region] = 0;
  for (const st of STATES) {
    const yearMap = data[st] && data[st][sex] && data[st][sex][year];
    const n = yearMap ? yearMap[name] || 0 : 0;
    byState[st] = n;
    byRegion[STATE_TO_REGION[st]] += n;
  }
  let total = 0;
  for (const r of REGION_ORDER) total += byRegion[r];
  return { byRegion, byState, total };
}

function namesFor(sex) {
  if (nameCache.has(sex)) return nameCache.get(sex);
  const set = new Set();
  for (const y of NICE_YEARS) {
    for (const st of STATES) {
      const yearMap = data[st] && data[st][sex] && data[st][sex][y];
      if (!yearMap) continue;
      for (const nm in yearMap) set.add(nm);
    }
  }
  const list = Array.from(set).sort();
  nameCache.set(sex, list);
  return list;
}

/* ---------------------------- scales ------------------------------ */

const W = 900;
const ROPE_Y = 120;
const ROPE_X0 = 60;
const ROPE_X1 = 840;
const ANCHOR_X = [0, 1 / 3, 2 / 3, 1].map((p) => ROPE_X0 + p * (ROPE_X1 - ROPE_X0));

/* --------------------------- rope view ---------------------------- */

function renderRope(m) {
  root.selectAll("*").remove();
  const g = root.append("g");

  // Hatch is the one non-tonal category marker in the monochrome scheme.
  const defs = root.append("defs");
  const pat = defs.append("pattern")
    .attr("id", "hatch").attr("width", 6).attr("height", 6)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  pat.append("rect").attr("width", 6).attr("height", 6).attr("fill", THEME.regionTone.Northeast);
  pat.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6)
    .attr("stroke", THEME.ink).attr("stroke-width", 1.2).attr("opacity", 0.55);

  // rope
  g.append("line")
    .attr("x1", ROPE_X0).attr("x2", ROPE_X1)
    .attr("y1", ROPE_Y).attr("y2", ROPE_Y)
    .attr("stroke", "#c9c2b8").attr("stroke-width", 9).attr("stroke-linecap", "round");

  // pull wedges: wide at the anchor, converging on the knot = pull strength
  REGION_ORDER.forEach((region, i) => {
    const x = ANCHOR_X[i];
    const w = m.weights[region];
    if (w <= 0.004) return;
    const hw = 2 + w * 26;
    g.append("path")
      .attr("d", "M" + x + "," + (ROPE_Y - hw) +
                 " L" + m.knotX + "," + (ROPE_Y - 1.5) +
                 " L" + m.knotX + "," + (ROPE_Y + 1.5) +
                 " L" + x + "," + (ROPE_Y + hw) + " Z")
      .attr("fill", region === THEME.hatchRegion ? "url(#hatch)" : REGION_COLORS[region])
      .attr("stroke", THEME.ink).attr("stroke-width", 1.2)
      .attr("opacity", 0.95);
  });

  // rope spine on top of the wedges so the line stays legible
  g.append("line")
    .attr("x1", ROPE_X0).attr("x2", ROPE_X1)
    .attr("y1", ROPE_Y).attr("y2", ROPE_Y)
    .attr("stroke", "#9a9187").attr("stroke-width", 2.5).attr("stroke-opacity", 0.75);

  // anchor ticks + team labels
  REGION_ORDER.forEach((region, i) => {
    const x = ANCHOR_X[i];
    const lead = region === m.lead;

    g.append("line")
      .attr("x1", x).attr("x2", x)
      .attr("y1", ROPE_Y - 10).attr("y2", ROPE_Y + 10)
      .attr("stroke", REGION_COLORS[region]).attr("stroke-width", 2.5);

    g.append("circle")
      .attr("cx", x).attr("cy", ROPE_Y).attr("r", 4.5)
      .attr("fill", "#fff")
      .attr("stroke", THEME.ink).attr("stroke-width", 2.5);

    g.append("text")
      .attr("x", x).attr("y", ROPE_Y - 50)
      .attr("text-anchor", "middle")
      .attr("font-size", 10).attr("font-weight", 700)
      .attr("letter-spacing", "0.14em")
      .attr("fill", THEME.ink)
      .text(region.toUpperCase());

    g.append("text")
      .attr("x", x).attr("y", ROPE_Y - 34)
      .attr("text-anchor", "middle")
      .attr("font-size", 10.5)
      .attr("fill", lead ? THEME.ink : THEME.muted)
      .text(m.rate[region].toFixed(1) + " per 100k");
  });

  // knot
  g.append("circle")
    .attr("cx", m.knotX).attr("cy", ROPE_Y).attr("r", 11)
    .attr("fill", THEME.ink).attr("stroke", THEME.paper).attr("stroke-width", 2);
  g.append("circle")
    .attr("cx", m.knotX).attr("cy", ROPE_Y).attr("r", 3.5)
    .attr("fill", THEME.paper);

  // knot label
  const flip = m.knotX > W - 190;
  g.append("text")
    .attr("x", flip ? m.knotX - 20 : m.knotX + 20)
    .attr("y", ROPE_Y + 46)
    .attr("text-anchor", flip ? "end" : "start")
    .attr("font-size", 9.5).attr("font-weight", 700).attr("letter-spacing", "0.14em")
    .attr("fill", THEME.ink)
    .text(m.lead ? "PULLED TOWARD " + m.lead.toUpperCase() : "NO PULL IN THIS YEAR");

  root.attr("aria-label",
    "Tug of war for " + sel.name + ", " + sel.year + ", " + (sel.sex === "F" ? "female" : "male") +
    ". Strongest pull: " + (m.lead || "none") + ".");
}

/* --------------------------- region cards -------------------------- */

function renderCards(m) {
  const sel2 = cardsEl.selectAll(".card").data(REGION_ORDER, (d) => d);
  sel2.exit().remove();

  const cards = sel2.enter().append("div").attr("class", "card").merge(sel2);
  cards.classed("lead", (d) => d === m.lead);

  cards.each(function (region) {
    const c = d3.select(this);
    c.html("");
    const head = c.append("div").attr("class", "rname");
    const sw = head.append("span").attr("class", "swatch")
      .style("background", REGION_COLORS[region]);
    if (region === THEME.hatchRegion) {
      sw.style("background-image",
        "repeating-linear-gradient(45deg, #111 0 1px, " + REGION_COLORS[region] + " 1px 4px)");
    }
    head.append("span").text(region.toUpperCase());
    if (region === m.lead) c.append("span").attr("class", "tag").text("Leading");

    const rate = c.append("div").attr("class", "rate");
    rate.text(m.rate[region].toFixed(1));
    rate.append("small").text("per 100k births");

    c.append("div").attr("class", "meta")
      .text(m.counts[region].toLocaleString() + " births - " + (m.share[region] * 100).toFixed(1) + "% of this name");

    const idx = m.index[region];
    const idxText = idx === null || !isFinite(idx) ? "no births" :
      (idx >= 1 ? "x" + idx.toFixed(2) + " the national rate" : "x" + idx.toFixed(2) + " the national rate");
    c.append("div").attr("class", "index")
      .style("color", idx !== null && idx >= 1.05 ? THEME.ink : THEME.muted)
      .text(idxText);

    const bar = c.append("div").attr("class", "bar");
    bar.append("i").style("background", REGION_COLORS[region])
      .style("width", Math.max(1, m.weights[region] * 100) + "%");
  });
}

/* ----------------------------- trend ------------------------------ */

function buildTrend(sex, name) {
  const key = sex + "|" + name;
  if (trendCache.has(key)) return trendCache.get(key);
  const rows = [];
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
    const totals = getTotals(sex, y);
    const c = getCounts(sex, y, name);
    const shares = {};
    for (const r of REGION_ORDER) shares[r] = c.total ? c.byRegion[r] / c.total : null;
    rows.push({ year: y, shares, total: c.total });
  }
  trendCache.set(key, rows);
  return rows;
}

function renderTrend(name, sex, year) {
  const rows = buildTrend(sex, name);
  trendEl.selectAll("*").remove();
  const m = { t: 18, r: 118, b: 30, l: 42 };
  const w = W - m.l - m.r;
  const h = 260 - m.t - m.b;
  const g = trendEl.append("g").attr("transform", "translate(" + m.l + "," + m.t + ")");

  // Ghost year numeral, straight out of the prototype.
  g.append("text")
    .attr("x", w - 8).attr("y", h * 0.9)
    .attr("text-anchor", "end")
    .attr("font-size", 150).attr("font-weight", 700)
    .attr("letter-spacing", "-0.05em")
    .attr("fill", "#f1f1ef")
    .text(year);

  const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([0, w]);
  const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  g.selectAll(".gridline").data(ticks).join("line")
    .attr("class", "gridline")
    .attr("x1", 0).attr("x2", w)
    .attr("y1", (d) => y(d)).attr("y2", (d) => y(d));

  const ax = g.append("g").attr("class", "axis").attr("transform", "translate(0," + h + ")")
    .call(d3.axisBottom(x).tickValues([1910, 1930, 1950, 1970, 1990, 2010, 2025]).tickFormat(d3.format("d")));
  ax.select(".domain").remove();
  const ay = g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickValues(ticks).tickFormat(d3.format(".0%")));
  ay.select(".domain").remove();

  g.append("text").attr("x", 0).attr("y", -4)
    .attr("font-size", 9).attr("font-weight", 700).attr("letter-spacing", "0.14em")
    .attr("fill", THEME.muted)
    .text("SHARE OF THIS NAME\u2019S BIRTHS");

  const line = d3.line()
    .defined((d) => d.shares[d.region] !== null)
    .x((d) => x(d.year))
    .y((d) => y(d.shares[d.region]));

  for (const region of REGION_ORDER) {
    const series = rows.map((d) => ({ year: d.year, shares: d.shares, region }));
    const path = g.append("path")
      .attr("d", line(series))
      .attr("fill", "none")
      .attr("stroke", THEME.regionLine[region])
      .attr("stroke-width", 2.2)
      .attr("stroke-linecap", "round");
    if (THEME.regionDash[region]) path.attr("stroke-dasharray", THEME.regionDash[region]);
  }

  // current-year marker
  g.append("line")
    .attr("x1", x(year)).attr("x2", x(year))
    .attr("y1", 0).attr("y2", h)
    .attr("stroke", THEME.ink).attr("stroke-width", 1).attr("stroke-dasharray", "3 3")
    .attr("stroke-opacity", 0.7);

  // region keys at the right end
  const last = rows[rows.length - 1];
  const ends = REGION_ORDER.map((region) => ({
    region,
    y: last.shares[region] === null ? null : y(last.shares[region]),
  })).filter((d) => d.y !== null).sort((a, b) => a.y - b.y);

  let prev = -100;
  for (const e of ends) {
    const yy = Math.max(e.y, prev + 14);
    prev = yy;
    g.append("text")
      .attr("x", w + 10).attr("y", yy + 4)
      .attr("font-size", 9).attr("font-weight", 700).attr("letter-spacing", "0.1em")
      .attr("fill", THEME.ink)
      .text(e.region.toUpperCase());
  }

  // click to pick a year
  g.append("rect")
    .attr("width", w).attr("height", h)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("click", (event) => {
      const px = d3.pointer(event, g.node())[0];
      const yr = Math.round(x.invert(px));
      setYear(yr);
    });

  trendEl.attr("aria-label", "Regional share of " + name + " births from 1910 to 2025.");
}

/* ---------------------------- update ------------------------------ */

function compute() {
  const name = titleCase(sel.name);
  const totals = getTotals(sel.sex, sel.year);
  const c = getCounts(sel.sex, sel.year, name);

  const rate = {};
  const index = {};
  for (const r of REGION_ORDER) {
    rate[r] = totals.byRegion[r] ? (c.byRegion[r] / totals.byRegion[r]) * 100000 : 0;
    index[r] = totals.national && totals.byRegion[r]
      ? rate[r] / ((c.total / totals.national) * 100000) : null;
  }
  let rateSum = 0;
  for (const r of REGION_ORDER) rateSum += rate[r];

  const weights = {};
  const share = {};
  let lead = null;
  let best = -1;
  for (const r of REGION_ORDER) {
    weights[r] = rateSum > 0 ? rate[r] / rateSum : 0;
    share[r] = c.total > 0 ? c.byRegion[r] / c.total : 0;
    if (rate[r] > best) { best = rate[r]; lead = r; }
  }
  if (c.total === 0) lead = null;

  let knot01 = 0;
  for (const r of REGION_ORDER) knot01 += weights[r] * (REGION_ORDER.indexOf(r) / (REGION_ORDER.length - 1));
  const knotX = ROPE_X0 + knot01 * (ROPE_X1 - ROPE_X0);

  return { name, rate, index, weights, share, counts: c.byRegion, lead, knotX, total: c.total };
}

function update() {
  const m = compute();
  renderRope(m);
  renderCards(m);
  renderTrend(m.name, sel.sex, sel.year);

  if (m.total === 0) {
    noteEl.text("No births recorded for \"" + m.name + "\" in " + sel.year + " (" + (sel.sex === "F" ? "female" : "male") + ").");
  } else {
    const top = REGION_ORDER.map((r) => ({ r, n: m.counts[r] })).sort((a, b) => b.n - a.n)[0];
    noteEl.text(m.total.toLocaleString() + " births nationally for \"" + m.name + "\" in " + sel.year +
      " - the " + top.r + " accounts for " + (m.share[top.r] * 100).toFixed(0) + "% of them.");
  }

  window.dispatchEvent(new CustomEvent("viz:selection", { detail: { ...sel } }));
}

/* --------------------------- controls ----------------------------- */

function setYear(y) {
  sel.year = Math.max(YEAR_MIN, Math.min(YEAR_MAX, Math.round(y)));
  document.getElementById("yearSlider").value = sel.year;
  document.getElementById("yearRead").textContent = sel.year;
  update();
}

function setSex(s) {
  sel.sex = s;
  for (const b of document.querySelectorAll(".sex button")) {
    b.setAttribute("aria-pressed", String(b.dataset.sex === s));
  }
  fillNameList();
  update();
}

function fillNameList() {
  const dl = document.getElementById("nameList");
  dl.innerHTML = "";
  for (const nm of namesFor(sel.sex)) {
    const o = document.createElement("option");
    o.value = nm;
    dl.appendChild(o);
  }
}

function wireControls() {
  const input = document.getElementById("nameInput");
  input.value = sel.name;
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (input.value.trim()) { sel.name = input.value; update(); }
    }, 120);
  });

  document.getElementById("yearSlider").addEventListener("input", (e) => setYear(e.target.value));

  // The "+" button focuses the name field; the search control holds one name at a time.
  const pick = document.getElementById("pickName");
  if (pick) pick.addEventListener("click", () => { input.focus(); input.select(); });
  for (const b of document.querySelectorAll(".sex button")) {
    b.addEventListener("click", () => setSex(b.dataset.sex));
  }
}

/* ----------------------------- boot ------------------------------- */

(async function boot() {
  try {
    await loadData();
  } catch (err) {
    document.getElementById("loadmsg").textContent = String(err.message || err);
    return;
  }
  fillNameList();
  wireControls();
  update();
  // Warm the totals cache for the current sex so the trend chart is instant next time.
  setTimeout(() => { for (let y = YEAR_MIN; y <= YEAR_MAX; y++) getTotals(sel.sex, y); }, 400);
})();
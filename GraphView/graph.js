import {
  buildSeries, namesFor, normalizeState, titleCase, YEARS
} from "./graphData.js";

/* ------------------------------------------------------------------ *
 * GraphView - CSC 805 Interactive Graph Visualizer                    *
 * State-level counts for one name, year and sex. 51 bars, alphabetical *
 * by state name, drawn in the project's monochrome (grayscale + ink)   *
 * language: no hue anywhere, identity carried by position + labels.    *
 * ------------------------------------------------------------------ */

const DATA_URLS = ["../MapView/baby_names.json", "./baby_names.json"];
const YEAR_MIN = YEARS.min;
const YEAR_MAX = YEARS.max;

const sel = { name: "Mary", year: 1991, sex: "F", measure: "count", order: "alpha", state: null };

let data = null;
let loadMs = null;
const totalsCache = new Map();   // "sex|year" -> { totals, national }
const nameCache = new Map();     // "sex" -> sorted name list for the datalist

const svgRoot = d3.select("#bars");
const noteEl = d3.select("#note");
const factsEl = d3.select("#facts");
const tipEl = document.getElementById("tip");

const W = 960;
const H = 432;
const M = { t: 26, r: 22, b: 112, l: 78 };
const IW = W - M.l - M.r;
const IH = H - M.t - M.b;

const fmtInt = d3.format(",.0f");
const fmtRate = d3.format(".1f");
const fmtAxis = d3.format(",.0f");

/* ----------------------------- data ------------------------------- */

function findDataUrl() {
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
  const overlay = document.getElementById("loading");
  if (overlay) overlay.remove();
  console.info("[GraphView] loaded " + Object.keys(data).length + " states in " + loadMs.toFixed(0) + " ms");
}

/** Per-state denominator (all births of that sex in that year), cached. */
function getTotals(sex, year) {
  const key = sex + "|" + year;
  const hit = totalsCache.get(key);
  if (hit) return hit;
  const out = buildSeries(data, { name: "", sex, year, measure: "count", order: "alpha" });
  // buildSeries with an empty name still computes the same denominators; reuse them.
  const totals = {};
  for (const row of out.rows) totals[row.state] = row.total;
  const cached = { totals, national: out.national };
  totalsCache.set(key, cached);
  return cached;
}

/* ---------------------------- tooltip ----------------------------- */

function placeTip(event) {
  const box = document.getElementById("chartBox").getBoundingClientRect();
  const px = event.clientX - box.left;
  const py = event.clientY - box.top;
  const tw = tipEl.offsetWidth;
  const th = tipEl.offsetHeight;
  let x = px + 14;
  let y = py - th - 12;
  if (x + tw > box.width - 4) x = Math.max(4, px - tw - 14);
  if (y < 2) y = py + 16;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
}

function showTip(d, rank) {
  tipEl.innerHTML =
    "<b>" + d.label + "</b>" +
    fmtInt(d.count) + (d.count === 1 ? " birth" : " births") +
    (d.total ? " <span>&middot; " + fmtRate(d.rate) + " per 100k</span>" : "") +
    "<br><span>rank " + rank + " of 51 by " + (sel.measure === "rate" ? "rate" : "count") + "</span>";
  tipEl.hidden = false;
}

function hideTip() {
  tipEl.hidden = true;
}

/* ---------------------------- chart ------------------------------- */

function renderChart(m) {
  svgRoot.selectAll("*").remove();
  const g = svgRoot.append("g").attr("transform", "translate(" + M.l + "," + M.t + ")");
  const rows = m.rows;

  const maxV = d3.max(rows, (d) => d.value) || 0;
  const y = d3.scaleLinear().domain([0, maxV > 0 ? maxV : 1]).nice().range([IH, 0]);
  const x = d3.scaleBand()
    .domain(rows.map((d) => d.state))
    .range([0, IW])
    .paddingInner(0.26)
    .paddingOuter(0.1);

  // Ghost year numeral behind the plot - same device as the regional trend panel.
  g.append("text")
    .attr("x", IW - 6).attr("y", IH - 12)
    .attr("text-anchor", "end")
    .attr("font-size", 150).attr("font-weight", 700).attr("letter-spacing", "-0.05em")
    .attr("fill", "#f1f1ef")
    .text(String(sel.year));

  // Dashed gridlines, then the solid baseline. Counts get integer ticks only.
  const ticks = m.measure === "rate" ? y.ticks(5) : y.ticks(5).filter((t) => Number.isInteger(t));
  g.append("g").selectAll("line").data(ticks).join("line")
    .attr("x1", 0).attr("x2", IW)
    .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
    .attr("stroke", "#d6d6d2").attr("stroke-dasharray", "2 3").attr("stroke-width", 1);

  g.append("line")
    .attr("x1", 0).attr("x2", IW).attr("y1", y(0)).attr("y2", y(0))
    .attr("stroke", "#111111").attr("stroke-width", 1.4);

  g.append("g").selectAll("text").data(ticks).join("text")
    .attr("x", -10).attr("y", (d) => y(d) + 3.5)
    .attr("text-anchor", "end").attr("font-size", 10)
    .attr("fill", "#6b6b6b")
    .text(fmtAxis);

  // Bars. Selected state (from the map, or clicked here) inverts to solid ink.
  const ranks = new Map();
  [...rows].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .forEach((d, i) => ranks.set(d.state, i + 1));

  for (const d of rows) {
    const bx = x(d.state);
    const bw = x.bandwidth();
    const on = d.state === sel.state;

    if (d.value > 0) {
      const top = y(d.value);
      const rect = g.append("rect")
        .attr("x", bx).attr("y", top).attr("width", bw)
        .attr("height", Math.max(1, IH - top))
        .attr("fill", on ? "#111111" : "#8a8a8a")
        .attr("stroke", "#111111").attr("stroke-width", 1)
        .style("cursor", "pointer")
        .attr("tabindex", 0);

      rect.append("title").text(d.label + ": " + fmtInt(d.count) + " births");

      rect
        .on("mouseenter", function () {
          if (!on) d3.select(this).attr("fill", "#6b6b6b");
          showTip(d, ranks.get(d.state));
        })
        .on("mousemove", placeTip)
        .on("mouseleave", function () {
          if (!on) d3.select(this).attr("fill", "#8a8a8a");
          hideTip();
        })
        .on("focus", () => showTip(d, ranks.get(d.state)))
        .on("blur", hideTip)
        .on("click", () => selectState(on ? null : d.state));
    } else {
      // A recorded zero, not a missing value: a hairline at the baseline.
      g.append("line")
        .attr("x1", bx + 1).attr("x2", bx + bw - 1)
        .attr("y1", IH - 0.5).attr("y2", IH - 0.5)
        .attr("stroke", "#c9c9c9").attr("stroke-width", 2)
        .append("title").text(d.label + ": no births recorded");
    }
  }

  // Selected-state tag above its bar.
  if (sel.state) {
    const d = rows.find((r) => r.state === sel.state);
    if (d) {
      const cx = x(d.state) + x.bandwidth() / 2;
      const top = d.value > 0 ? y(d.value) : IH;
      const ty = Math.max(2, top - 16);
      g.append("rect")
        .attr("x", cx - 12).attr("y", ty).attr("width", 24).attr("height", 13)
        .attr("fill", "#111111");
      g.append("text")
        .attr("x", cx).attr("y", ty + 9.5)
        .attr("text-anchor", "middle")
        .attr("font-size", 7.5).attr("font-weight", 700).attr("letter-spacing", "0.08em")
        .attr("fill", "#ffffff")
        .text(sel.state);
    }
  }

  // Rotated state names. Rotated so 51 full names stay readable.
  g.append("g").selectAll("text").data(rows).join("text")
    .attr("transform", (d) =>
      "translate(" + (x(d.state) + x.bandwidth() / 2) + "," + (IH + 12) + ") rotate(-90)")
    .attr("text-anchor", "end")
    .attr("dy", "0.32em")
    .attr("font-size", 9)
    .attr("font-weight", (d) => (d.state === sel.state ? 700 : 400))
    .attr("fill", (d) => (d.state === sel.state ? "#111111" : "#6b6b6b"))
    .text((d) => d.label);

  // Boxed y-axis label.
  const lbl = m.measure === "rate" ? "BIRTHS PER 100K" : "BIRTHS";
  const bw2 = lbl.length * 6.6 + 16;
  const box = g.append("g").attr("transform", "translate(-56," + IH / 2 + ") rotate(-90)");
  box.append("rect")
    .attr("x", -bw2 / 2).attr("y", -9).attr("width", bw2).attr("height", 18)
    .attr("fill", "#ffffff").attr("stroke", "#111111").attr("stroke-width", 1);
  box.append("text")
    .attr("x", 0).attr("y", 3.5)
    .attr("text-anchor", "middle")
    .attr("font-size", 9).attr("font-weight", 700).attr("letter-spacing", "0.14em")
    .attr("fill", "#111111")
    .text(lbl);

  // Empty state: say it in the plot, not only in the caption.
  if (m.total === 0) {
    g.append("text")
      .attr("x", IW / 2).attr("y", IH / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 13).attr("font-weight", 700).attr("letter-spacing", "0.04em")
      .attr("fill", "#6b6b6b")
      .text("No births recorded for " + String.fromCharCode(8220) + m.name + String.fromCharCode(8221) +
            " in " + sel.year + " (" + (sel.sex === "F" ? "female" : "male") + ")");
  }

  svgRoot.attr("aria-label",
    m.total === 0
      ? "Bar chart: no births recorded for " + m.name + " in " + sel.year + "."
      : "Bar chart of " + m.name + ", " + sel.year + ", " + (sel.sex === "F" ? "female" : "male") +
        ". " + fmtInt(m.total) + " births nationally, spread over " + m.recorded +
        " states. Highest: " + topState(m).label + " with " + fmtInt(topState(m).count) + ".");
}

function topState(m) {
  return m.rows.reduce((a, b) => (b.count > a.count ? b : a), m.rows[0]);
}

/* ----------------------------- caption ---------------------------- */

function renderNote(m) {
  if (m.total === 0) {
    noteEl.html("No births in the data for <b>" + m.name + "</b> in " + sel.year +
      " (" + (sel.sex === "F" ? "female" : "male") + "). Try another year or the other sex.");
    return;
  }
  const top = topState(m);
  const share = (top.count / m.total) * 100;
  noteEl.html(
    fmtInt(m.total) + " births nationally for <b>" + m.name + "</b> in " + sel.year +
    " (" + (sel.sex === "F" ? "female" : "male") + "). <b>" + top.label + "</b> holds " +
    share.toFixed(1) + "% of them" +
    (m.recorded === 51
      ? "; all 51 areas recorded at least one."
      : "; " + m.recorded + " of 51 areas recorded at least one.")
  );
}

function renderFacts(m) {
  // The second card follows the active measure so the headline state always matches the bars.
  const ranked = [...m.rows].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))[0];
  const facts = [
    { k: "U.S. total", v: fmtInt(m.total), s: "births of this name" },
    m.measure === "rate"
      ? { k: "Highest rate", v: m.total ? fmtRate(ranked.rate) : "0.0", s: m.total ? ranked.label + " per 100k" : "none recorded" }
      : { k: "Largest count", v: m.total ? fmtInt(ranked.count) : "0", s: m.total ? ranked.label : "none recorded" },
    { k: "Areas recorded", v: m.recorded + " / 51", s: "states + DC with at least one" },
    { k: "National rate", v: fmtRate(m.nationalRate), s: "per 100k births of this sex" }
  ];

  const sel2 = factsEl.selectAll(".fact").data(facts);
  sel2.exit().remove();
  const enter = sel2.enter().append("div").attr("class", "fact").merge(sel2);
  enter.html("");
  enter.append("div").attr("class", "k").text((d) => d.k);
  enter.append("div").attr("class", "v").text((d) => d.v);
  enter.append("div").attr("class", "s").text((d) => d.s);
}

/* ---------------------------- update ------------------------------ */

function update() {
  const m = buildSeries(data, {
    name: sel.name, sex: sel.sex, year: sel.year, measure: sel.measure, order: sel.order
  });
  renderChart(m);
  renderNote(m);
  renderFacts(m);
  writeQuery();
  window.dispatchEvent(new CustomEvent("viz:selection", { detail: { ...sel } }));
}

/* --------------------------- url state ---------------------------- */

function readQuery() {
  const q = new URLSearchParams(location.search);
  const name = q.get("name");
  if (name && name.trim()) sel.name = titleCase(name);
  const year = Number(q.get("year"));
  if (year >= YEAR_MIN && year <= YEAR_MAX) sel.year = Math.round(year);
  const sex = (q.get("sex") || "").toUpperCase();
  if (sex === "F" || sex === "M") sel.sex = sex;
  const st = normalizeState(q.get("state") || q.get("sel"));
  if (st) sel.state = st;
  const measure = q.get("measure");
  if (measure === "rate" || measure === "count") sel.measure = measure;
  const order = q.get("order");
  if (order === "value" || order === "alpha") sel.order = order;
}

function writeQuery() {
  const q = new URLSearchParams();
  q.set("name", sel.name);
  q.set("year", String(sel.year));
  q.set("sex", sel.sex);
  if (sel.state) q.set("state", sel.state);
  if (sel.measure !== "count") q.set("measure", sel.measure);
  if (sel.order !== "alpha") q.set("order", sel.order);
  history.replaceState(null, "", location.pathname + "?" + q.toString());
}

function navHref(base, extra) {
  const q = new URLSearchParams();
  q.set("name", sel.name);
  q.set("year", String(sel.year));
  q.set("sex", sel.sex);
  if (extra && sel.state) q.set(extra, sel.state);
  return base + "?" + q.toString();
}

function syncNav() {
  const back = document.getElementById("backRegional");
  const map = document.getElementById("backMap");
  if (back) back.href = navHref("../RegionalView/regional.html");
  if (map) map.href = navHref("../MapView/map.html");
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
  for (const b of document.querySelectorAll(".seg [data-sex]")) {
    b.setAttribute("aria-pressed", String(b.dataset.sex === s));
  }
  fillNameList();
  update();
}

function selectState(st) {
  sel.state = st;
  update();
}

function fillNameList() {
  const dl = document.getElementById("nameList");
  dl.innerHTML = "";
  for (const nm of namesFor(data, sel.sex)) {
    const o = document.createElement("option");
    o.value = nm;
    dl.appendChild(o);
  }
}

function syncControls() {
  document.getElementById("nameInput").value = sel.name;
  document.getElementById("yearSlider").value = sel.year;
  document.getElementById("yearRead").textContent = sel.year;
  for (const b of document.querySelectorAll("[data-sex]")) {
    b.setAttribute("aria-pressed", String(b.dataset.sex === sel.sex));
  }
  for (const b of document.querySelectorAll("[data-measure]")) {
    b.setAttribute("aria-pressed", String(b.dataset.measure === sel.measure));
  }
  for (const b of document.querySelectorAll("[data-order]")) {
    b.setAttribute("aria-pressed", String(b.dataset.order === sel.order));
  }
}

function wireControls() {
  const input = document.getElementById("nameInput");
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = input.value.trim();
      if (v) { sel.name = titleCase(v); update(); }
    }, 120);
  });
  input.addEventListener("change", () => {
    const v = input.value.trim();
    if (v) { sel.name = titleCase(v); input.value = sel.name; update(); }
  });

  document.getElementById("yearSlider").addEventListener("input", (e) => setYear(e.target.value));

  const pick = document.getElementById("pickName");
  if (pick) pick.addEventListener("click", () => { input.focus(); input.select(); });

  for (const b of document.querySelectorAll("[data-sex]")) {
    b.addEventListener("click", () => setSex(b.dataset.sex));
  }
  for (const b of document.querySelectorAll("[data-measure]")) {
    b.addEventListener("click", () => {
      sel.measure = b.dataset.measure;
      syncControls();
      update();
    });
  }
  for (const b of document.querySelectorAll("[data-order]")) {
    b.addEventListener("click", () => {
      sel.order = b.dataset.order;
      syncControls();
      update();
    });
  }
}

/* ----------------------------- boot ------------------------------- */

// Deep-link + integration contract: other views (or the shell) can push a selection.
window.GraphView = {
  getSelection: () => ({ ...sel }),
  setSelection: (next) => {
    if (!next) return;
    if (next.name) sel.name = titleCase(next.name);
    if (Number(next.year) >= YEAR_MIN) sel.year = Math.round(Number(next.year));
    if (next.sex === "F" || next.sex === "M") sel.sex = next.sex;
    if ("state" in next) sel.state = normalizeState(next.state);
    syncControls();
    update();
  }
};

(async function boot() {
  readQuery();
  try {
    await loadData();
  } catch (err) {
    const msg = document.getElementById("loadmsg");
    if (msg) msg.textContent = String(err.message || err);
    noteEl.text("Could not load baby_names.json: " + String(err.message || err));
    return;
  }
  syncControls();
  fillNameList();
  wireControls();
  update();
  syncNav();
})();

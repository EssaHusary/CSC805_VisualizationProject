/* ==========================================================================

   @file gender.js
   @author Citlally Chavez
   @brief draws a single name bubble that slides between male and female based on
   the share of babies given that name each year. the user can type a name,
   drag or play the year slider, and hover the bubble for exact numbers.

   @requires d3 v7 (loaded in gender.html)
   @requires national_baby_names.json

   ========================================================================== */


/* ---------- setup ---------- */

const width = 860;
const height = 400;
const svg = d3.select("#chart");   //empty <svg> from gender.html

// turns percent female (0 to 1) into a pixel position: 0 = all male, 1 = all female
const x = d3.scaleLinear().domain([0, 1]).range([120, 740]);

// shared state, every control changes these and then calls update()
let data = null;             
let currentName = "Leslie";  // null means no name is selected
let currentYear = 1910;


/* ---------- background ---------- */

// big gray year behind everything
svg.append("text")
  .attr("id", "bigYear")
  .attr("x", width / 2)
  .attr("y", height / 2 + 60)
  .attr("text-anchor", "middle")
  .attr("font-size", 200)
  .attr("font-weight", "bold")
  .attr("fill", "#ddd")
  .text(currentYear);

// dashed lines 
[0, 1].forEach(value => {
  svg.append("line")
    .attr("x1", x(value)).attr("x2", x(value))
    .attr("y1", 30).attr("y2", 330)
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "5 5");
});

[["MALE", 0], ["UNISEX", 0.5], ["FEMALE", 1]].forEach(([label, value]) => {
  const boxWidth = label.length * 11 + 20;   
  const boxHeight = 30;
  const g = svg.append("g")
    .attr("transform", `translate(${x(value)}, 370)`);

  // black rectangle shifted down-right
  g.append("rect")
    .attr("x", -boxWidth / 2 + 4)
    .attr("y", -boxHeight / 2 + 4)
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .attr("fill", "black");

  g.append("rect")
    .attr("x", -boxWidth / 2)
    .attr("y", -boxHeight / 2)
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")   
    .attr("font-weight", "bold")
    .attr("font-size", 14)
    .text(label);
});

/* ---------- the bubble ---------- */

// one group holds the circle, its shadow, its label, and the x button so they move together
const bubble = svg.append("g").attr("class", "bubble");

// black circle offset down-right = the hard shadow (drawn first so it sits behind)
bubble.append("circle")
  .attr("class", "shadow")
  .attr("cx", 5).attr("cy", 5)
  .attr("fill", "black");

// the white circle on top
bubble.append("circle")
  .attr("class", "main")
  .attr("fill", "white")
  .attr("stroke", "black")
  .attr("stroke-width", 2);

// the name inside the circle
bubble.append("text")
  .attr("class", "label")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .attr("font-size", 13);

// the little x button, clears the bubble when clicked
const closeBtn = bubble.append("g")
  .attr("class", "close")
  .style("cursor", "pointer")
  .on("click", () => {
    stopPlaying();
    currentName = null;   // null means no name selectted
    update();
  });

closeBtn.append("circle")
  .attr("r", 10)
  .attr("fill", "black")
  .attr("stroke", "white")
  .attr("stroke-width", 2);

closeBtn.append("text")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .attr("font-size", 12)
  .attr("fill", "white")
  .style("pointer-events", "none")   //so clicks land on the circle
  .text("✕");

// sqrt so the circle's area (not its radius) grows with the birth count
const radius = d3.scaleSqrt().domain([0, 60000]).range([18, 70]).clamp(true);


/* ---------- data lookup ---------- */

// returns how many girls and boys got this name in this year
function getCounts(name, year) {
  const yearData = data[year];
  return {
    f: yearData["F"][name] || 0,   //names with under 5 babies are missing, so undefined becomes 0
    m: yearData["M"][name] || 0
  };
}


/* ---------- update (redraws the bubble) ---------- */

// every control just changes currentName or currentYear and then calls this
function update() {

  // keep the year displays in sync
  d3.select("#bigYear").text(currentYear);
  d3.select("#yearLabel").text(currentYear);
  d3.select("#yearSlider").property("value", currentYear);

  // no name selected 
  if (currentName === null) {
    bubble.style("display", "none");
    message.text("Type a name and press +");
    return;
   }
  const { f, m } = getCounts(currentName, currentYear);
  const total = f + m;

  //nobody had this name that year, also avoids dividing by zero below
  if (total === 0) {
    bubble.style("display", "none");
    message.text(`No data for "${currentName}" in ${currentYear}`);
    return;
  }

  message.text("");
  bubble.style("display", null);

  const pctFemale = f / total;   // 0 = all male, 1 = all female
  const r = radius(total);

  // transitions make the bubble slide and resize instead of jumping
  bubble.transition().duration(300)
    .attr("transform", `translate(${x(pctFemale)}, 200)`);
  bubble.select(".main").transition().duration(300).attr("r", r);
  bubble.select(".shadow").transition().duration(300).attr("r", r);



  // keep the x button on the top-right edge of the circle as it resizes
  bubble.select(".close").transition().duration(300)
    .attr("transform", `translate(${r * 0.7}, ${-r * 0.7})`);
  bubble.select(".label").text(currentName);
}

/* ---------- slider ---------- */

d3.select("#yearSlider").on("input", event => {
  stopPlaying();                        // dragging slider pauses playback
  currentYear = +event.target.value;    
  update();
});

/* ---------- "no data" message ---------- */

// shown in the middle of the chart when there's nothing to draw
const message = svg.append("text")
  .attr("x", width / 2)
  .attr("y", 200)
  .attr("text-anchor", "middle")
  .attr("font-size", 18);


/* ---------- text box ---------- */

function setName() {
  const typed = d3.select("#nameInput").property("value").trim();
  if (typed === "") return;   // ignore empty box

  // the data stores names like "Mary" (first letter capital, rest lowercase)
  currentName = typed.charAt(0).toUpperCase() + typed.slice(1).toLowerCase();
  update();
}

d3.select("#addBtn").on("click", setName);
d3.select("#nameInput").on("keydown", event => {
  if (event.key === "Enter") setName();
});

/* ---------- play button ---------- */

let timer = null;   // holds the running animation, or null when stopped

function stopPlaying() {
  clearInterval(timer);
  timer = null;
  d3.select("#playBtn").text("▶");
}

d3.select("#playBtn").on("click", () => {

  // click means pause
  if (timer) {
    stopPlaying();
    return;
  }

  // otherwise start playing
  d3.select("#playBtn").text("❚❚");
  if (currentYear >= 2025) currentYear = 1910;   //restart if were at the end

  // setInterval runs the function over and over until we clear it
  timer = setInterval(() => {
    currentYear++;
    d3.select("#yearSlider").property("value", currentYear);   // move slider too
    update();
    if (currentYear >= 2025) stopPlaying();                    // stop at end
  }, 150);   //new year every 0.15 seconds
});

/* ---------- navigation buttons ---------- */
// ../ means go up one folder, then into the other view's folder
d3.select("#mapBtn").on("click", () => {
  window.location.href = "../MapView/map.html";  
});
d3.select("#regionalBtn").on("click", () => {
  window.location.href = "../RegionalView/regional.html";
});

/* ---------- hover info box ---------- */

const tooltip = d3.select("#tooltip");
const fmt = d3.format(",");   

// rank of a name among names of one sex that year (1 = most popular)
function rankOf(name, year, sex) {
  const count = data[year][sex][name] || 0;
  let rank = 1;
  // rank = 1 + how many names have a higher count (the json isn't stored with ranks)
  for (const other in data[year][sex]) {
    if (data[year][sex][other] > count) rank++;
  }
  return rank;
}

function showTooltip(event) {
  if (currentName === null) return;

  const { f, m } = getCounts(currentName, currentYear);
  const total = f + m;
  if (total === 0) return;

  const pctF = (f / total * 100).toFixed(1);
  const pctM = (m / total * 100).toFixed(1);

  // rank within whichever sex uses the name more
  const sex = f >= m ? "F" : "M";
  const rank = rankOf(currentName, currentYear, sex);
  const sexWord = sex === "F" ? "girls" : "boys";

  tooltip
    .style("display", "block")
    .html(`
      <div class="title">${currentName}, ${currentYear}</div>
      <div>${fmt(total)} babies total</div>
      <div>#${fmt(rank)} name for ${sexWord}</div>
      <div>${pctF}% female (${fmt(f)})</div>
      <div>${pctM}% male (${fmt(m)})</div>
    `)
    .style("left", (event.pageX + 15) + "px")   // offset so the box doesn't sit under the cursor
    .style("top", (event.pageY + 15) + "px");
}

function hideTooltip() {
  tooltip.style("display", "none");
}

// lets the mouse see through the name text so hovering doesn't flicker
bubble.select(".label").style("pointer-events", "none");

// only the white circle triggers the box, not the x button
bubble.select(".main")
  .on("mouseover", showTooltip)
  .on("mousemove", showTooltip)   // keeps the box following the mouse
  .on("mouseout", hideTooltip);


/* ---------- load the data ---------- */

// the json loads once, and the first draw waits until it's ready
d3.json("national_baby_names.json").then(json => {
  data = json;
  console.log("Data loaded!");
  update();
});
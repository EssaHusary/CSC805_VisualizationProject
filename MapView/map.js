let babyDataIndex = {};  // Stores the soon-to-be baby names JSON file as a global (this is for testing purposes).

// This function gets the state-level baby_names.json file, effectively loading it into memory.
async function loadData() {
    const response = await fetch('baby_names.json');   // Fetches the state-level baby name JSON data from the folder
    babyDataIndex = await response.json();             // Waits for the object and stores it in babyDataIndex
    console.log("Data loaded and ready for instant lookups!");
    return babyDataIndex;
}

// This function essentially prints out test values to make sure that the loading process worked.
async function printData() {
    // I 'await' the loadData call so JavaScript pauses until the process of fetching and storing is complete.
    await loadData();
    
    // Now babyDataIndex holds my JSON object. Here are some values we can print.
    console.log("Full object:", babyDataIndex);
    console.log("CA Data:", babyDataIndex["CA"]);
    console.log("Cali Female Data:", babyDataIndex["CA"]["F"]);
    console.log("Cali Female 2020 Data:", babyDataIndex["CA"]["F"]["2020"]);
    console.log("Top-level keys:", Object.keys(babyDataIndex));
}

/* The following code was, WITH PERMISSION FROM PROFESSOR HUMAYOUN, taken from Nina's D3 map drawing tutorials.
   I made a couple of modifications to ensure that we standardize on d3 version 7, which includes having
   an asyncronous call to the states-10m.json file from the topojson/us-atlas repository. Standardizing on v7 caused some
   unexpected issues with drawing the map. I had to switch out the JSON file I got from the Publica Mundi repository to the 
   official d3 U.S. atlas geo data repository. 
   
   The Public Mundi data we WERE using is here: https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json 
   The topoJSON data will we be NOW using is here: https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json. 
   
   Using the topoJSON client made drawing the map way more reliable and future proof since it is an official d3 repository. 
*/

// Dimensions of the soon-to-be U.S. map featuring states
var width = 975;
var height = 610;

// To create the SVG object. Will become the map in a bit.
var svg = d3.select('#usa_map')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

var g = svg.append('g');  // This is a collection or grouping of SVG ('path') elements.

var albersUSAProjection = d3.geoAlbersUsa();   // This is the projection function which projects actual coordinates to pixel mappings on the screen.

var geoPath = d3.geoPath().projection(albersUSAProjection);  // To draw the map on the 2D screen.


// Define the div for the tooltip
// var div = d3.select("#answer").append("div")
//     .attr("class", "tooltip")
//     .style("opacity", 0);


/* Load the TopoJSON file (states-10m.json) using d3 v7 conventions and draw the map. It is in a promise block just in case 
   the CDN link is down. In my opinion, it's better to fetch the topoJSON data this way instead of keeping it locally. We 
   are future-proofing ourselves. */
d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(function(topologyStateBoundaries) {
    
    // The following set of SVG calls draws the map of the U.S.
    g.selectAll('path')
        
        /* Converts TopoJSON to GeoJSON features. What topojson does is ensures that individual state boundaries are not 
           redrawn. It stores state boundaries. The .feature() function transforms the topoJSON format into the geoJSON 
           format to allow for drawing. The first parameter is the whole topoJSON data structure (a dictionary) and the 
           second parameter is an index into this dictionary data structure that holds the state boundaries. The .features 
           appended to the end of the second parameter is basically an index to the reconstructed GeoJSON object, obtaining 
           state data, including FIPS state codes */
        .data(topojson.feature(topologyStateBoundaries, topologyStateBoundaries.objects.states).features) 
        .enter()                        // Creates placeholders for each state 'path'  
        .append('path')                 // Specifies that each placeholder will be an SVG 'path' object
        .attr('fill', '#d4d4d4')      // Styling for the state color
        .attr('stroke', '#000000')    // Styling for the state borders
        .attr('d', geoPath)             // Begins the drawing of the map
        .attr('fill-opacity', 1)
        .on("mouseover", function (event, d) {                 // Darkens a state when mouse hovers over it
            d3.select(this).style("fill", "black");
        })
        .on("mouseout", function (event, d) {                  // The state returns to its former color when the mouse cursor is off of it 
            d3.select(this).style("fill", "#d4d4d4");
        })
        .on("click", async function (event, d) {               // This turns the state red AND triggers printData test. This
            d3.select(this).style("fill", "red");              // is purely for testing purposes.
            await printData();
        });

}).catch(function(error) {
    console.error("Error! Either loading or parsing the TopoJSON file is the culprit. Here is the error:", error);
});

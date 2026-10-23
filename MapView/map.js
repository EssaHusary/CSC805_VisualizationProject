
// This is the URL to the GeoJSON data for US states:

// var url = https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json?short_path=1c1ebe5



let babyDataIndex = {};  // Stores the soon-to-be baby names JSON file

// This function gets the baby_names.json file, effectively loading it into memory.
async function loadData() {
    const response = await fetch('baby_names.json');
    babyDataIndex = await response.json();
    console.log("Data loaded and ready for instant lookups!");
    return babyDataIndex;
}

// This function essentially prints out test values to make sure that the loading process worked.
async function printData() {
    // I 'await' the loadData call so JavaScript pauses 
    // until the fetch and parse are fully complete.
    await loadData();
    
    // Now babyDataIndex holds my JSON object
    console.log("Full object:", babyDataIndex);
    console.log("CA Data:", babyDataIndex["CA"]);
    console.log("More Data:", babyDataIndex["CA"]["F"]["2020"]);
    console.log("Top-level keys:", Object.keys(babyDataIndex));
}


/* The following code was, WITH PERMISSION FROM PROFESSOR HUMAYOUN, taken from Nina's D3 map drawing tutorials */

// Dimensions of the soon-to-be U.S. map featuring states
var width = 975;
var height = 610;

// To create the SVG object. Will become the map in a bit.
var svg = d3.select('#usa_map')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

var g = svg.append('g');  // This is a collection or grouping of SVG ('path') elements.

var albersUSAProjection = d3.geoAlbersUsa()   // This is the projection function which projects actual coordinates to pixels mappings on the screen.

var geoPath = d3.geoPath().projection(albersUSAProjection);  // To draw the map on the 2D screen.


// Define the div for the tooltip
// var div = d3.select("#answer").append("div")
//     .attr("class", "tooltip")
//     .style("opacity", 0);


// This set of SVG calls draws the map of the U.S.
g.selectAll('path')
    .data(usa_json_mod.features)  // Uses as data the coordinates from the usa_json_mod file
    .enter()                      // Creates placeholders for each state 'path'  
    .append('path')               // Specifies that each placeholder will be an SVG 'path' object
    .attr('fill', '#d4d4d4')    // Styling for the state color
    .attr('stroke', '#000000')  // Styling for the state borders
    .attr('d', geoPath)           // Begins the drawing of the map
    .attr('fill-opacity', function (d, i) { return 1; })
    .on("mouseover", function (d) {                 // Darkens a state when mouse hovers over it
        d3.select(this).style("fill", "black");
    })
    .on("mouseout", function (d) {                  // The state returns to its former color when the mouse cursor is off of it
        d3.select(this).style("fill", "#d4d4d4");

    })
    .on("click", function (d) {                     // If you click on a state, it will turn red. Won't work if you inlude the next line of code below
        d3.select(this).style("fill", "red");
    })
    .on("click", printData)                         /* Calls the printData function (which prints out values from the loaded JSON file). This is a test 
                                                       call */


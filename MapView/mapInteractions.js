import {babyDataIndex, g} from './map.js';  // Import the baby names JSON data and 'g' (the SVG collection of 'paths') from map.js


/* This is a collection of U.S. state FIPS codes associated with a baby name frequency. It will be transformed into a map. I have initialized all values
   in the second index of each inner array to be a value of 0, as I will be updating them in the function called "getDataFromMapInteractions" (found 
   below this collection). The reason I did not create a Map right away is because in my function below this collection, I need to iterate over the JSON
   data. I cannot index into this collection if it were a map using an integer index, per JavaScript rules. So, a workaround is to temporarily make this 
   collection an array of arrays, which I will transform into a map once I have updated all of the inner arrays first. Do note that the state FIPS codes you
   see are not in order only because our JSON data is ordered alphabetically in two-letter state codes such as California's 'CA' abbreviation, whereas
   the FIPS codes are ordered by the full names of each state. Going by two-letter abbreviations, Alaska would precede Alabama because Alaska's state code 
   is 'AK', but Alabama's is 'AL'. But we see that Alabama should obviously precede Alaska when comparing the full names. This latter point is how FIPS codes
   are ordered. So because our JSON data is ordered by two-letter state codes, I had to compensate for that by ordering the below collection according to that
   ordering to preserve data integrity. Lastly, I am using state FIPS codes because the topoJSON data that I used to draw the map has state FIPS
   codes associated with each state 'path' in the SVG element, 'g'. So the 'g' SVG path collection I imported above, which I used to draw the map, has state 
   FIPS codes for each 'path'. It makes sense then that to color a state 'path' opacity as a function of baby name frequency, I would need to associate state 
   FIPS codes with frequency, which I am doing below. */
let stateFIPSArray = [
    ["02", 0], ["01", 0], ["05", 0], ["04", 0], ["06", 0], ["08", 0], ["09", 0], ["11", 0], ["10", 0], ["12", 0],
    ["13", 0], ["15", 0], ["19", 0], ["16", 0], ["17", 0], ["18", 0], ["20", 0], ["21", 0], ["22", 0], ["25", 0],
    ["24", 0], ["23", 0], ["26", 0], ["27", 0], ["29", 0], ["28", 0], ["30", 0], ["37", 0], ["38", 0], ["31", 0],
    ["33", 0], ["34", 0], ["35", 0], ["32", 0], ["36", 0], ["39", 0], ["40", 0], ["41", 0], ["42", 0], ["44", 0],
    ["45", 0], ["46", 0], ["47", 0], ["48", 0], ["49", 0], ["51", 0], ["50", 0], ["53", 0], ["55", 0], ["54", 0],
    ["56", 0]
    
]



/* This is a function that stores into the collection above the baby name frequencies for a given: gender (male or female), year, and name. We check what 
   gender(s) has been selected and retrieve the corresponding data from the JSON object. We then transform the collection found above into a map using the
   constructor Map(), and return this newly constructed map. */
async function getDataFromMapInteractions(genderMale, genderFemale, year, name) {
    
    let data = await babyDataIndex;   // To wait for the JSON data Promise

    let i = 0;    /* To use as an index into the stateFIPSArray collection at the top of this page. It is also a counter, as it only goes for as long as 
                     we have keys in the JSON data */

    for (const state of Object.keys(data)) {    /* To iterate across all of the keys of the JSON data, which is effectively a map. */
        
        if ((!genderMale && !genderFemale) || !name) {     /* If no gender or name is provided by the user, return an empty map (promise). We will not 
                                                              display data on the map. */
            return new Map()
        
        } else if (genderMale && !genderFemale) {      /* To check if the user selected only the male checkbox */
            
            let value = data[state]["M"][year][name]     // Get the frequency value from the JSON data

            if (!value) {         /* To check if any value exists. If not, it means that our data set does not have a frequency for that given gender, year, 
                                     and name */
                value = 0
            }

            stateFIPSArray[i][1] = value    // Store this value into the collection (to be transformed into a map in a little bit)

        } else if (!genderMale && genderFemale) {      /* To check if the user selected only the female checkbox */
            
            let value = data[state]["F"][year][name]

            if (!value) {
                value = 0
            }

            stateFIPSArray[i][1] = value

        } else if (genderMale && genderFemale) {       /* To check if the user selected both checkboxes */
            
            let valueMale = data[state]["M"][year][name] 
            
            let valueFemale = data[state]["F"][year][name]

            if (!valueMale) {
                valueMale = 0
            }

            if (!valueFemale) {
                valueFemale = 0
            }

            let totalValue = valueMale + valueFemale

            stateFIPSArray[i][1] = totalValue     // We combine values in case a name is unisex
        }

        i = i + 1     // Update the counter/index
        
    }

    let stateFIPSMap = new Map(stateFIPSArray)   // Transform the array collection into a new map
    return stateFIPSMap

    
}





/* This function calculates the sum of all of the frequencies for a given gender, year, and name. The reason I do this is so that when we calculate the state's
   color opacity, we get a percentage, a proportion, if you will, of its frequency relative by the total frequency of that name throughout the entire country */
async function calculateSum(stateMapPromise){

    let stateMap = await stateMapPromise
    let sum = 0
    
    for (const [stateFIPSCode, value] of stateMap){    // We iterate and sum the frequency values
        
        sum = sum + value

    }

    return sum

}





/* This function selects 'g', the collection of state 'paths', and calculates their opacity. The way .selectAll() works for a collection of 'paths' is that 
   d3 iterates through all the paths, applying changes specified in the callback function (arrow function). We accessed each of the state 
   'paths' data by using the parameter, 'd' in the callback function. Since the topoJSON data I retrieved to draw the map has state FIPS codes associated with 
   each state, I use each path's id property to index into the 'stateMap' map to acquire a frequency. Recall that 'stateMap' was an array of arrays that was
   transformed into a map containing state FIPS codes with associated baby name frequency values. */
async function colorOpacity(stateMapPromise, sumPromise){
    let stateMap = await stateMapPromise;
    let sum = await sumPromise;

    g.selectAll('path')    // Define the color of the state ('path') if the frequency value is 0
    .attr('fill', (d) => {
        if (stateMap.get(d.id)){    /* If the state has data for the name the user inputs, let that state be colored red, for now at least, as we'll change 
                                       its opacity in the next couple lines*/
            return 'red'
        
        } else {                   /* Otherwise, if there is no data for that name for that state, let it have the default color of white that we set when we 
                                      originally drew the map */
            return 'white'
        
        }
    })
    .attr('fill-opacity', (d, i, nodes) => {     // A callback arrow function to color state opacity
        
        if (d.id >= 60) {    /* If the state code is in fact a U.S. territory, having an FIPS code > 60, let it have the color white (not that we can see it 
                                anyways) */
        
            return 0;
        
        } else {             /* Otherwise, if it is a U.S. state, having an FIPS < 60, color by 1) first, making it a proportion of its frequency and the total 
                                number of frequencies across the whole country, and then 2) take its square root. Taking th square root of this quotient scales
                                the opacity such that we can still see states with lower populations having some opacity. */
        
            return Math.sqrt(stateMap.get(d.id) / sum);
        
        }
    })
}





/* When a user clicks the 'submitButton', the name the user wants to analyze will be processed. This name is acquired from the 
   'nameInput' textbox. */
d3.select("#submitButton")
    .on("click", function(event, d) {
        
        event.preventDefault();             // Prevents the form from refreshing the page, as we will lose state opacity data. 
        let name = d3.select("#nameInput").property("value");    // To access the name the user inputted
        d3.select("#nameInput").datum(name);                    /* To data bind the name the user inputted to this HTML 
                                                                   text element */

        /* The following four lines declare and initialize variables to the current d3 binded data of each HTML element to pass
           into my function from above */
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        /* To call my protoype function (located all the way up top) to get state-to-state data corresponding to the user's 
           selected gender, year, and name (binded in the lines above) */
        let stateMapPromise = getDataFromMapInteractions(male, female, newYear, inputtedName);

        let sumPromise = calculateSum(stateMapPromise);    // Calculate the total sum of the frequencies of the provided name

        colorOpacity(stateMapPromise, sumPromise)          // To color the opacity of each state according to frequency

})


/* The first d3.select statement initially binds the year 1910 to 'timeSlider', so that upon the browser loading up, the user
   doesn't have to slide it right away. They can just stay comfortably on the year 1910, the chronological starting point. The
   next d3.select statement binds whatever year the user slides to onto the 'timeSlider' element. */
d3.select("#timeSlider").datum(d3.select("#timeSlider").property("value"))
d3.select("#timeSlider")
    .on("input", function(event, d) {
        
        let year = event.target.value;    // Get the current year the slider is on.
        d3.select(this).datum(year)       // Bind that data to timeSlider
        
        /* The following four lines declare and initialize variables to the current d3 binded data of each HTML element to pass
           into my function from above */
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        /* To call my protoype function (located all the way up top) to get state-to-state data corresponding to the user's 
           selected gender, year, and name (binded in the lines above) */
        let stateMapPromise = getDataFromMapInteractions(male, female, newYear, inputtedName);

        let sumPromise = calculateSum(stateMapPromise);    // Calculate the total sum of the frequencies of the provided name

        colorOpacity(stateMapPromise, sumPromise)          // To color the opacity of each state according to frequency
})


/* The first d3.select statement initially binds a value of 'false' to 'maleCheckbox' by accessing the 'checked' property of 
   'maleCheckbox'. We want it to default to 'false' so that: 1) the user can initially select whatever gender they want to use 
   in the filter upon browser loading, as we don't want to force a choice on them, and 2) so that the map does not display data
   right away. The user must first check one of the two boxes. The objective of the second d3.select statement is to bind the 
   new boolean value of the checkbox to 'maleCheckbox'.
 */
d3.select("#maleCheckbox").datum(d3.select("#maleCheckbox").property("checked"))
d3.select("#maleCheckbox")
    .on("click", function(event, d) {

        let maleChecked = event.target.checked;    // To get the new 'checked' boolean from 'maleCheckbox'
        d3.select(this).datum(maleChecked);        // Binds the new 'checked' boolean to 'maleCheckbox'


        // Initialize new variables to pass into my function, according to current d3 data binding on the DOM.
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        /* To call my protoype function (located all the way up top) to get state-to-state data corresponding to the user's 
           selected gender, year, and name (binded in the lines above) */
        let stateMapPromise = getDataFromMapInteractions(male, female, newYear, inputtedName);

        let sumPromise = calculateSum(stateMapPromise);    // Calculate the total sum of the frequencies of the provided name

        colorOpacity(stateMapPromise, sumPromise)          // To color the opacity of each state according to frequency
})



/* The first d3.select statement initially binds a value of 'false' to 'femaleCheckbox' by accessing the 'checked' property of 
   'femaleCheckbox'. We want it to default to 'false' so that: 1) the user can initially select whatever gender they want to use
   in the filter upon browser loading, as we don't want to force a choice on them, and 2) so that the map does not display data
   right away. The user must first check one of the two boxes. The objective of the second d3.select statement is to bind the 
   new boolean value of the checkbox to 'femaleCheckbox'.
 */
d3.select("#femaleCheckbox").datum(d3.select("#femaleCheckbox").property("checked"))
d3.select("#femaleCheckbox")
    .on("click", function(event, d) {

        let femaleChecked = event.target.checked;    // To get the new 'checked' boolean from 'femaleCheckbox'
        d3.select(this).datum(femaleChecked);        // Binds the new 'checked' boolean to 'femaleCheckbox'


        // Initialize new variables to pass into my function, according to current d3 data binding on the DOM.
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        /* To call my protoype function (located all the way up top) to get state-to-state data corresponding to the user's 
           selected gender, year, and name (binded in the lines above) */
        let stateMapPromise = getDataFromMapInteractions(male, female, newYear, inputtedName);

        let sumPromise = calculateSum(stateMapPromise);    // Calculate the total sum of the frequencies of the provided name

        colorOpacity(stateMapPromise, sumPromise)          // To color the opacity of each state according to frequency
})
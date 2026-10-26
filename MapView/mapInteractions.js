import {babyDataIndex} from './map.js';  // Import the baby names JSON data from map.js

//console.log("Imported babyDataIndex:", babyDataIndex);  // This will print a Promise object because loadData is async.


/* This is a prototype test function that is called in each of d3's .on(click) and .on(input) event listeners. The purpose of 
   it is to be a prototype of a function that will compute and fill state opacities corresponding to baby name frequency for a 
   given: state, gender, and name. For now, I am printing out state-to-state data for a given: state, gender, and name. It
   works very well and checks to ensure that a name and gender MUST be inputted. */
async function getDataFromMapInteractions(genderMale, genderFemale, year, name) {
    
    let data = await babyDataIndex;   // To wait for the JSON data Promise

    for (const state of Object.keys(data)) {    /* To iterate across all of the keys of the Promise object, which is effectively 
                                                   the whole JSON object. */
        
        if ((!genderMale && !genderFemale) || !name) {  /* If no name or gender is provided by the user, don't do anything. This
                                                         is to prepare for not filling state opacities when insufficient input
                                                         is provided. */
            return 0
        
        } else if (genderMale && !genderFemale) {      /* To check if the user selected only the male checkbox */
            
            console.log("Name: " + name + "\nState :" + state + "\nGender: " + "M" + "\nYear: " + year + 
                "\nValue: " + data[state]["M"][year][name])

        } else if (!genderMale && genderFemale) {      /* To check if the user selected only the female checkbox */
            
            console.log("Name: " + name + "\nState :" + state + "\nGender: " + "F" + "\nYear: " + year + 
                "\nValue: " + data[state]["F"][year][name])

        } else if (genderMale && genderFemale) {       /* To check if the user selected both checkboxes */
            
            console.log("Name: " + name + "\nState :" + state + "\nGender: " + "M and F" + "\nYear: " + year + 
                "\nValue: " + parseInt(data[state]["M"][year][name], 10) + " " + parseInt(data[state]["F"][year][name], 10))
        }
        
    }

    
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
        getDataFromMapInteractions(male, female, newYear, inputtedName);
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
        getDataFromMapInteractions(male, female, newYear, inputtedName);
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
        
        // console.log("Default value: " + d3.select("#maleCheckbox").datum())

        let maleChecked = event.target.checked;    // To get the new 'checked' boolean from 'maleCheckbox'
        d3.select(this).datum(maleChecked);        // Binds the new 'checked' boolean to 'maleCheckbox'

        // console.log("New value: " + d3.select("#maleCheckbox").datum())

        // Initialize new variables to pass into my function, according to current d3 data binding on the DOM.
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        getDataFromMapInteractions(male, female, newYear, inputtedName);
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
        
        // console.log("New value: " + d3.select("#femaleCheckbox").datum())

        let femaleChecked = event.target.checked;    // To get the new 'checked' boolean from 'femaleCheckbox'
        d3.select(this).datum(femaleChecked);        // Binds the new 'checked' boolean to 'femaleCheckbox'

        // console.log("New value: " + d3.select("#femaleCheckbox").datum())


        // Initialize new variables to pass into my function, according to current d3 data binding on the DOM.
        let male = d3.select("#maleCheckbox").datum();
        let female = d3.select("#femaleCheckbox").datum();
        let newYear = d3.select("#timeSlider").datum();
        let inputtedName = d3.select("#nameInput").datum();

        getDataFromMapInteractions(male, female, newYear, inputtedName);
})

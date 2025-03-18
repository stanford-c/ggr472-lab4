/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3RhbmZvcmRjaGFuZyIsImEiOiJjbTVvZHBxOHUwa3p2Mmxwbm90N2I0MzZqIn0.JfQLnEhITEAZl2kHoQP7rA';

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/stanfordchang/cm8f523xv00ah01ryflkzfojj',
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 11 // starting zoom level
});

// Add map controls
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/

// Create empty variable
let collisionData;

// Map load event handler
map.on('load', () => {

    // Fetch GeoJSON from URL and store response in variable
    fetch('https://raw.githubusercontent.com/stanford-c/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson')
        .then(response => response.json())
        .then(response => {
            console.log(response); // Check response in console
            collisionData = response; // Store GeoJSON as variable using URL from response

        // Add collision points source
        map.addSource('collisions', {
            type: 'geojson',
            data: collisionData
        });

        // Add collision points layer
        map.addLayer({
            id: 'collision-points',
            type: 'circle',
            source: 'collisions',
            paint: {
                'circle-radius': 3,
                'circle-color': '#ff0000',
            }
        });

/*--------------------------------------------------------------------
Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/

        // Create bounding box
        let envresult = turf.envelope(collisionData); // Store bounding box around collision points as a variable
        let bbox = envresult.bbox; // Access and store bounding box coordinates as an array variable
        let bboxPolygon = turf.bboxPolygon(bbox); // Create Polygon feature from bbox array variable
        let bboxPScaled = turf.transformScale(bboxPolygon, 1.1); // Enlarge bbox feature by 10%
        let bboxScaled = turf.bbox(bboxPScaled); // Store the coordinates of the enlarged bbox feature

        // Create grid of 0.5km hexagons inside enlarged bbox coordinates
        let hexgrid = turf.hexGrid(bboxScaled, 0.5, {units: 'kilometres'});

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/

        let collishex = turf.collect(hexgrid, collisionData, '_id', 'values');

        // Initialize maximum collision count variable
        let maxcollis = 0;

        // Loop through each hexagon feature
        collishex.features.forEach((feature) => {
            feature.properties.COUNT = feature.properties.values.length // Create COUNT property set to the number of collision points inside
            
            // If this hexagon contains more collision points than the current maximum, update the maximum collision count variable
            if (feature.properties.COUNT > maxcollis) {
                maxcollis = feature.properties.COUNT
            }
        });
        console.log(maxcollis);

        // View hexgrid
        map.addSource('hexgrid', {
            type: 'geojson',
            data: collishex
        });
        
        map.addLayer({
            id: 'hexgrid-layer',
            type: 'fill',
            source: 'hexgrid',
            filter: ['>', ['get', 'COUNT'], 0], // Hide hexagons containing zero colliisons
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'COUNT'],
                    // Red rose wine colour palette
                    1, '#f2f2f2',
                    10, '#ffb9b9',
                    20, '#ee7272',
                    30, '#a31818',
                    40, '#6d0202',
                    50, '#360000'
                ],
                'fill-opacity': 0.7,
                'fill-outline-color': '#000'
            }
        });

    });
});

/*--------------------------------------------------------------------
Step 5: FINALIZE WEB MAP
--------------------------------------------------------------------*/

/*------------------------------
LEGEND
--------------------------------*/
const legend = document.getElementById('legend');
const legendlabels = ['< 10', '10-19', '20-29', '30-39', '40-49', '50+'];
const legendcolours = ['#f2f2f2', '#ffb9b9', '#ee7272', '#a31818', '#6d0202', '#360000'];

legendlabels.forEach((label, i) => {
    const colour = legendcolours[i];

    const item = document.createElement('div'); // Create row for each layer
    const key = document.createElement('span'); // Create key for each row

    key.className = 'legend-key'; // Properties defined in style.css
    key.style.backgroundColor = colour; // Colour retrieved from layers array

    const value = document.createElement('span'); // Add value variable to legend row
    value.innerHTML = `${label}`; // Assign value variable text based on label

    item.appendChild(key); // Add key to legend row
    item.appendChild(value); // Add value to legend row

    legend.appendChild(item); // Add row to legend
});


/*------------------------------
MOUSE EVENTS
--------------------------------*/

// Show pop-up window when clicked
map.on('click', 'hexgrid-layer', (e) => {
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`Collisions: ${e.features[0].properties.COUNT}`)
        .addTo(map);
});

/*------------------------------
LISTENERS FOR HTML ELEMENTS
--------------------------------*/
// Toggle visibility of hexgrid
let hexcheck = document.getElementById('hexcheck');

hexcheck.addEventListener('click', () => {
    if (hexcheck.checked) {
        hexcheck.checked = true;
        map.setLayoutProperty('hexgrid-layer', 'visibility', 'visible');
    }
    else {
        hexcheck.checked = false;
        map.setLayoutProperty('hexgrid-layer', 'visibility', 'none');
    }
});


// Toggle visibility of collisions
let collisioncheck = document.getElementById('collisioncheck');

collisioncheck.addEventListener('click', () => {
    if (collisioncheck.checked) {
        collisioncheck.checked = true;
        map.setLayoutProperty('collision-points', 'visibility', 'visible');
    }
    else {
        collisioncheck.checked = false;
        map.setLayoutProperty('collision-points', 'visibility', 'none');
    }
});

// Toggle visibility of legend
let legendcheck = document.getElementById('legendcheck');

legendcheck.addEventListener('click', () => {
    if (legendcheck.checked) {
        legendcheck.checked = true;
        legend.style.display = 'block';
    }
    else {
        legend.style.display = "none";
        legendcheck.checked = false;
    }
});
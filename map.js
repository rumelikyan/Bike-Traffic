mapboxgl.accessToken = 'pk.eyJ1Ijoicm1lbGlreWFuIiwiYSI6ImNtN2UzNG5lNjBhMW4ydm9ncmNmNTQ5YTMifQ.JlZyVnYSn3WrdG_ZRMqn4A';

   // Initialize the map
   const map = new mapboxgl.Map({
     container: 'map', // ID of the div where the map will render
     style: 'mapbox://styles/mapbox/dark-v11', // Map style
     center: [-71.0967349,42.3600949], // [longitude, latitude]
     zoom: 12, // Initial zoom level
     minZoom: 5, // Minimum allowed zoom
     maxZoom: 18 // Maximum allowed zoom
   });

map.addControl(new mapboxgl.NavigationControl());

map.addControl(new mapboxgl.ScaleControl());

map.on('load', () => { 
    // Add the GeoJSON source
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson' // Ensure this URL is valid
    });

    // Add a layer to display the bike lanes
    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        layout: {}, // Required for line layers, even if empty
        paint: {
            'line-color': '#008000', // Green color
            'line-width': 3,
            'line-opacity': 0.6 // Slightly more visible
        }
    });
    
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson' // Cambridge Data
    });

    // Add the Cambridge bike lanes layer
    map.addLayer({
        id: 'bike-lanes-cambridge',
        type: 'line',
        source: 'cambridge_route',
        layout: {}, // Required for line layers
        paint: {
            'line-color': '#FF4500',  // Orange-red for distinction
            'line-width': 5,          // Same width for consistency
            'line-opacity': 0.6       // Matches Boston transparency
        }
    });
    

});

const jsonurl = INPUT_BLUEBIKES_CSV_URL;
  d3.json(jsonurl)
    .then(jsonData => {
      console.log('Loaded JSON Data:', jsonData);  // Log to verify structure

      // ✅ Extract station data
      const stations = jsonData.data.stations;
      console.log('Stations Array:', stations);

      // Optional: Process station data here if needed

    })
    .catch(error => {
      console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    });
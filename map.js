mapboxgl.accessToken = 'pk.eyJ1Ijoicm1lbGlreWFuIiwiYSI6ImNtN2UzNG5lNjBhMW4ydm9ncmNmNTQ5YTMifQ.JlZyVnYSn3WrdG_ZRMqn4A';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-71.0967349, 42.3600949],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.ScaleControl());
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);
let stations = [], trips = [], departures, arrivals;
let timeFilter = -1;
const timeSlider = document.getElementById('time-filter');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');
timeSlider.min = -1;
timeSlider.max = 1439;
timeSlider.value = -1;
const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
map.on('load', () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });
  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#008000',
      'line-width': 3,
      'line-opacity': 0.6
    }
  });
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#FF4500',
      'line-width': 3,
      'line-opacity': 0.6
    }
  });
  const svg = d3.select('#map').select('svg');
  d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json')
    .then(jsonData => {
      stations = jsonData.data.stations;
      d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv')
        .then(csvData => {
          trips = csvData.map(trip => ({
            ...trip,
            started_at: new Date(trip.started_at),
            ended_at: new Date(trip.ended_at)
          }));
          for (let trip of trips) {
            let startedMinutes = minutesSinceMidnight(trip.started_at);
            departuresByMinute[startedMinutes].push(trip);
            let endedMinutes = minutesSinceMidnight(trip.ended_at);
            arrivalsByMinute[endedMinutes].push(trip);
          }
          departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
          arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);
          stations = stations.map(station => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
          });
          updateCircles(stations);
        })
        .catch(error => console.error('Error loading CSV:', error));
    })
    .catch(error => console.error('Error loading JSON:', error));
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}
function updateCircles(stationData) {
  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stationData, d => d.totalTraffic)])
    .range(timeFilter === -1 ? [0, 25] : [3, 50]);
  let circles = d3.select('#map').select('svg')
    .selectAll('circle')
    .data(stationData, d => d.short_name)
    .join('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.7)
    .style("--departure-ratio", d => stationFlow(d.departures / d.totalTraffic))
    .each(function (d) {
      d3.select(this).selectAll('title').remove();
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });
  updatePositions();
}
function updatePositions() {
  d3.selectAll('circle')
    .attr('cx', d => getCoords(d).cx)
    .attr('cy', d => getCoords(d).cy);
}
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}
function filterTripsByTime(timeVal) {
  if (timeVal === -1) {
    return {
      filteredArrivals: arrivals,
      filteredDepartures: departures,
      filteredStations: stations
    };
  }
  const filteredDepartures = d3.rollup(
    filterByMinute(departuresByMinute, timeVal),
    v => v.length,
    d => d.start_station_id
  );
  const filteredArrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeVal),
    v => v.length,
    d => d.end_station_id
  );
  const filteredStations = stations.map(station => {
    let newStation = { ...station };
    let id = newStation.short_name;
    newStation.arrivals = filteredArrivals.get(id) ?? 0;
    newStation.departures = filteredDepartures.get(id) ?? 0;
    newStation.totalTraffic = newStation.arrivals + newStation.departures;
    return newStation;
  });
  return {
    filteredArrivals,
    filteredDepartures,
    filteredStations
  };
}
function filterByMinute(tripsByMinute, minute) {
  let minMinute = (minute - 60 + 1440) % 1440,
      maxMinute = (minute + 60) % 1440;
  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute),
        afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}
function updateTimeDisplay() {
  timeFilter = Number(timeSlider.value);
  if (timeFilter === -1) {
    selectedTime.textContent = '';
    anyTimeLabel.style.display = 'block';
  } else {
    selectedTime.textContent = formatTime(timeFilter);
    anyTimeLabel.style.display = 'none';
  }
  const { filteredStations } = filterTripsByTime(timeFilter);
  updateCircles(filteredStations);
}
timeSlider.addEventListener('input', updateTimeDisplay);
updateTimeDisplay();

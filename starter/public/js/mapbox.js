/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidHVtZWxvY2ViYSIsImEiOiJja3owbmhobnQwODVjMm90MjM4NWRmbWNpIn0.oyGE-ofSzKz2u_YEtuu-pg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    scrollZoon: false,
    //center: ,
    //zoom: 10,
    //interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((location) => {
    // Create marker
    const element = document.createElement('div');
    element.className = 'marker';

    //Add marker

    new mapboxgl.Marker({
      element,
      anchor: 'bottom',
    })
      .setLngLat(location.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
      .addTo(map);

    //Extends map bounds to include current location
    bounds.extend(location.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};

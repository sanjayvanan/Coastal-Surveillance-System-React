// ENC (Electronic Navigational Chart) Layer Configuration with S-57 (S-52 Day Palette) Colors
// Enhanced with text labels for depth soundings and feature names

export const getEncLayers = () => {
  return [
    // LAND AREAS (LNDARE)
    {
      id: 'enc-lndare-fill',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'lndare_polygons',
      paint: {
        'fill-color': '#D9C29E', // LANDA
        'fill-opacity': 1
      }
    },
    {
      id: 'enc-lndare-outline',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'lndare_polygons',
      paint: {
        'line-color': '#826644', // LANDB
        'line-width': 1
      }
    },

   // DEPTH AREAS (DEPARE)
{
  id: 'enc-depare-fill',
  type: 'fill',
  source: 'active-basemap',
  'source-layer': 'depare_polygons',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'drval1'],
      0, '#9AD5FF',   // DEPVS (Very Shallow, S-52)
      10, '#77B5FF',  // DEPMD (Medium, S-52)
      50, '#508CFF',  // DEPIT (Intermediate, S-52)
      200, '#285AFF'  // DEPDW (Deep, S-52)
    ],
    'fill-opacity': 0.6
  }
},

//It is working but we dont need to show depth area labels on the default map view, on user interaction we can show it

// // DEPTH AREA LABELS
// {
//   id: 'enc-depare-labels',
//   type: 'symbol',
//   source: 'active-basemap',
//   'source-layer': 'depare_polygons',
//   minzoom: 10,
//   layout: {
//     'text-field': [
//       'concat',
//       ['to-string', ['coalesce', ['get', 'drval1'], '']],
//       '-',
//       ['to-string', ['coalesce', ['get', 'drval2'], '']]
//     ],
//     'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
//     'text-size': 11,
//     'symbol-placement': 'point'
//   },
//   paint: {
//     'text-color': '#1e3a8a',      // DEPDW text
//     'text-halo-color': '#ffffff', // white halo
//     'text-halo-width': 1.5
//   }
// },

// DEPTH CONTOURS (DEPCNT)              // dotted lines on the depth areas
{
  id: 'enc-depcnt-lines',
  type: 'line',
  source: 'active-basemap',
  'source-layer': 'depcnt_lines',
  paint: {
    'line-color': '#94BFFF',    // DEPCN S-52
    'line-width': 1,
    'line-dasharray': [2, 2]    // 'dashed'
  }
},

// Works but we dont need to show depth contour labels on the default map view, on user interaction we can show it

// // DEPTH CONTOUR LABELS
// {
//   id: 'enc-depcnt-labels',
//   type: 'symbol',
//   source: 'active-basemap',
//   'source-layer': 'depcnt_lines',
//   minzoom: 11,
//   layout: {
//     'text-field': ['to-string', ['coalesce', ['get', 'valdco'], ['get', 'depth'], '']],
//     'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
//     'text-size': 10,
//     'symbol-placement': 'line',
//     'text-rotation-alignment': 'map',
//     'text-pitch-alignment': 'viewport'
//   },
//   paint: {
//     'text-color': '#1e40af',      // DEPDW text
//     'text-halo-color': '#ffffff', // white halo
//     'text-halo-width': 1.5
//   }
// },

// COASTLINE (COALNE)
{
  id: 'enc-coastline-lines',
  type: 'line',
  source: 'active-basemap',
  'source-layer': 'coalne_lines',
  paint: {
    'line-color': '#6B4423',  // CSTLN S-52 value
    'line-width': 1.5
  }
},

// Red lateral buoys
// Show ALL boylat without any filter - NO PURPLE, just show them as-is
{
  id: 'enc-boylat-all',
  type: 'circle',
  source: 'active-basemap',
  'source-layer': 'boylat',
  paint: {
    'circle-radius': 8,
    'circle-color': '#FF0000',  // Make them RED
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-width': 2
  }
  // NO FILTER - shows ALL boylat
},

// Show ALL boyspp without any filter
{
  id: 'enc-boyspp-all',
  type: 'circle',
  source: 'active-basemap',
  'source-layer': 'boyspp',
  paint: {
    'circle-radius': 8,
    'circle-color': '#FFFF00',  // Make them YELLOW
    'circle-stroke-color': '#000000',
    'circle-stroke-width': 2
  }
  // NO FILTER - shows ALL boyspp
},

// Show ALL boysaw without any filter (just in case)
{
  id: 'enc-boysaw-all',
  type: 'circle',
  source: 'active-basemap',
  'source-layer': 'boysaw',
  paint: {
    'circle-radius': 8,
    'circle-color': '#00FFFF',  // Make them CYAN
    'circle-stroke-color': '#000000',
    'circle-stroke-width': 2
  }
  // NO FILTER - shows ALL boysaw
},
// BUOY LABELS - for boylat (red buoys)
{
  id: 'enc-boylat-labels',
  type: 'symbol',
  source: 'active-basemap',
  'source-layer': 'boylat',
  minzoom: 10,  // Start showing earlier
  layout: {
    'text-field': ['get', 'objnam'],
    'text-size': 12,
    'text-anchor': 'top',
    'text-offset': [0, 1.2],
    'text-allow-overlap': true,  // Force show even with overlap
    'symbol-placement': 'point'
  },
  paint: {
    'text-color': '#000000',
    'text-halo-color': '#FFFFFF',
    'text-halo-width': 3
  }
},

// BUOY LABELS - for boyspp (yellow buoys)
{
  id: 'enc-boyspp-labels',
  type: 'symbol',
  source: 'active-basemap',
  'source-layer': 'boyspp',
  minzoom: 10,
  layout: {
    'text-field': ['get', 'objnam'],
    'text-size': 12,
    'text-anchor': 'top',
    'text-offset': [0, 1.2],
    'text-allow-overlap': true,
    'symbol-placement': 'point'
  },
  paint: {
    'text-color': '#000000',
    'text-halo-color': '#FFFFFF',
    'text-halo-width': 3
  }
},

// BUOY LABELS - for boysaw (cyan buoys)
{
  id: 'enc-boysaw-labels',
  type: 'symbol',
  source: 'active-basemap',
  'source-layer': 'boysaw',
  minzoom: 10,
  layout: {
    'text-field': ['get', 'objnam'],
    'text-size': 12,
    'text-anchor': 'top',
    'text-offset': [0, 1.2],
    'text-allow-overlap': true,
    'symbol-placement': 'point'
  },
  paint: {
    'text-color': '#000000',
    'text-halo-color': '#FFFFFF',
    'text-halo-width': 3
  }
},

 // BEACONS (BCNLAT, BCNSPP)
    {
      id: 'enc-bcnlat',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'bcnlat',
      paint: {
        'circle-radius': 6,
        'circle-color': '#FF0000', // Red lateral
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'enc-bcnspp',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'bcnspp',
      paint: {
        'circle-radius': 6,
        'circle-color': '#FFFF00', // Yellow special
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },

     // BEACON LABELS
    {
      id: 'enc-beacon-labels',
      type: 'symbol',
      source: 'active-basemap',
      'source-layer': 'bcnlat',
      minzoom: 12,
      layout: {
        'text-field': ['coalesce', ['get', 'objnam'], ['get', 'name'], ''],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-anchor': 'top',
        'text-offset': [0, 0.8],
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2
      }
    },




  ];
};
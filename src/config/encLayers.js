// ENC (Electronic Navigational Chart) Layer Configuration with S-57 (S-52 Day Palette) Colors

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
          0, '#9AD5FF',  // DEPVS (Very Shallow)
          10, '#77B5FF', // DEPMD (Medium)
          50, '#508CFF', // DEPIT (Intermediate)
          200, '#285AFF' // DEPDW (Deep)
        ],
        'fill-opacity': 0.6
      }
    },

    // DEPTH CONTOURS (DEPCNT)
    {
      id: 'enc-depcnt-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'depcnt_lines',
      paint: {
        'line-color': '#94BFFF', // DEPCN
        'line-width': 1,
        'line-dasharray': [2, 2]
      }
    },

    // COASTLINE (COALNE)
    {
      id: 'enc-coastline-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'coalne_lines',
      paint: {
        'line-color': '#6B4423', // CSTLN
        'line-width': 1.5
      }
    },

    // BUOYS (BOYLAT, BOYSPP, BOYSAW)
    {
      id: 'enc-boylat-red',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boylat',
      paint: {
        'circle-radius': 5,
        'circle-color': '#FF0000', // BCNLAT Red
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      },
      filter: ['==', ['get', 'color'], 'red']
    },
    {
      id: 'enc-boylat-green',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boylat',
      paint: {
        'circle-radius': 5,
        'circle-color': '#00FF00', // BCNLAT Green
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      },
      filter: ['==', ['get', 'color'], 'green']
    },
    {
      id: 'enc-boyspp',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boyspp',
      paint: {
        'circle-radius': 5,
        'circle-color': '#FFFF00', // Special - Yellow
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
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

   // LIGHTS - S-57 Standard Display
    // Light Range Circle (Nominal Range)
    {
      id: 'enc-lights-range',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'lights',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, ['*', ['coalesce', ['get', 'valnmr'], 5], 0.5],  // valnmr = nominal range in nautical miles
          12, ['*', ['coalesce', ['get', 'valnmr'], 5], 2],
          16, ['*', ['coalesce', ['get', 'valnmr'], 5], 4]
        ],
        'circle-color': 'transparent',
        'circle-stroke-color': '#CCCF00', // LITRD (Light radius color)
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.6
      },
      minzoom: 10
    },
    // Light Center Point with Color
    {
      id: 'enc-lights-center',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'lights',
      paint: {
        'circle-radius': 5,
        'circle-color': [
          'match',
          ['get', 'colour'],
          1, '#FFFFFF',  // White (W)
          3, '#FF0000',  // Red (R)
          4, '#00FF00',  // Green (G)
          6, '#FFFF00',  // Yellow (Y)
          11, '#FFA500', // Orange (Or)
          '#FFFF00'      // Default yellow
        ],
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },
    // Light Flare Effect (Star)
    {
      id: 'enc-lights-flare',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'lights',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'colour'],
          1, '#FFFFFF',
          3, '#FF0000',
          4, '#00FF00',
          6, '#FFFF00',
          11, '#FFA500',
          '#FFFF00'
        ],
        'circle-opacity': 0.3,
        'circle-blur': 0.8
      }
    },

    // OBSTRUCTIONS (OBSTRN)
    {
      id: 'enc-obstrn',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'obstrn_points',
      paint: {
        'circle-radius': 4,
        'circle-color': '#FF0000',
        'circle-opacity': 0.7
      }
    },

    // WRECKS
    {
      id: 'enc-wrecks',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'wrecks_points',
      paint: {
        'circle-radius': 5,
        'circle-color': '#8B4513',
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },

    // UNDERWATER ROCKS (UWTROC)
    {
      id: 'enc-uwtroc',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'uwtroc',
      paint: {
        'circle-radius': 4,
        'circle-color': '#A0522D',
        'circle-opacity': 0.8
      }
    },

    // SOUNDINGS (SNDG)
    {
      id: 'enc-soundg',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'soundg',
      paint: {
        'circle-radius': 2,
        'circle-color': '#94BFFF', // SNDG1
        'circle-opacity': 0.8
      }
    },

    // RESTRICTED AREAS (RESARE)
    {
      id: 'enc-resare',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'resare',
      paint: {
        'fill-color': '#FF00FF', // RESBL
        'fill-opacity': 0.2,
        'fill-outline-color': '#CC00CC'
      }
    },

    // ANCHORAGES (ACHARE)
    {
      id: 'enc-achare',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'achare_polygons',
      paint: {
        'fill-color': '#00FFFF', // ACHBL
        'fill-opacity': 0.3,
        'fill-outline-color': '#00CCCC'
      }
    },

    // TRAFFIC SEPARATION (TSSBND)
    {
      id: 'enc-tssbnd',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'tssbnd_lines',
      paint: {
        'line-color': '#FF00FF',
        'line-width': 2,
        'line-dasharray': [4, 2]
      }
    },

    // CABLES & PIPELINES
    {
      id: 'enc-cblsub',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'cblsub_lines',
      paint: {
        'line-color': '#FFD700',
        'line-width': 1.5,
        'line-dasharray': [5, 3]
      }
    },
    {
      id: 'enc-pipsol',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'pipsol_lines',
      paint: {
        'line-color': '#8B4513',
        'line-width': 1.5,
        'line-dasharray': [5, 3]
      }
    },

    // RADIO STATIONS (RDOSTA)
    {
      id: 'enc-rdosta',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'rdosta',
      paint: {
        'circle-radius': 4,
        'circle-color': '#0000FF',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    }
  ];
};

// ENC (Electronic Navigational Chart) Complete Layer Configurations
// All layers from your T-Rex config

export const getEncLayers = () => {
  return [
    // BACKGROUND
    {
      id: 'enc-ocean-background',
      type: 'background',
      paint: {
        'background-color': '#A5BFDD'
      }
    },

    // LAND AREAS (LNDARE)
    {
      id: 'enc-lndare-fill',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'lndare_polygons',
      paint: {
        'fill-color': '#F0E6D2',
        'fill-opacity': 1
      }
    },
    {
      id: 'enc-lndare-outline',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'lndare_polygons',
      paint: {
        'line-color': '#8B7355',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 1, 12, 1.5],
        'line-opacity': 0.8
      }
    },
    {
      id: 'enc-lndare-points',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'lndare_points',
      minzoom: 10,
      paint: {
        'circle-radius': 3,
        'circle-color': '#8B7355'
      }
    },
    {
      id: 'enc-lndare-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'lndare_lines',
      paint: {
        'line-color': '#8B7355',
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
          0, '#6BA3D4',    // Shallow
          10, '#5B93C4',   // Medium
          50, '#4B83B4',   // Deep
          200, '#3B73A4'   // Very deep
        ],
        'fill-opacity': 0.6
      }
    },
    {
      id: 'enc-depare-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'depare_lines',
      paint: {
        'line-color': '#4B83B4',
        'line-width': 0.5
      }
    },

    // DEPTH CONTOURS (DEPCNT)
    {
      id: 'enc-depcnt-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'depcnt_lines',
      minzoom: 6,
      paint: {
        'line-color': '#7AAFE8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 1.5],
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
        'line-color': '#2C5F2D',
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 12, 2]
      }
    },
    {
      id: 'enc-coastline-polygons',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'coalne_polygons',
      paint: {
        'line-color': '#2C5F2D',
        'line-width': 1.5
      }
    },

    // BUOYS (BOYLAT, BOYSAW, BOYSPP)
    {
      id: 'enc-boylat',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boylat',
      minzoom: 8,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6],
        'circle-color': '#FF0000',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'enc-boysaw',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boysaw',
      minzoom: 8,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6],
        'circle-color': '#FFA500',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'enc-boyspp',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'boyspp',
      minzoom: 8,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6],
        'circle-color': '#FFFF00',
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
      minzoom: 8,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7],
        'circle-color': '#00FF00',
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'enc-bcnspp',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'bcnspp',
      minzoom: 8,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7],
        'circle-color': '#FFFF00',
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },

    // LIGHTS
    {
      id: 'enc-lights',
      type: 'symbol',
      source: 'active-basemap',
      'source-layer': 'lights',
      minzoom: 8,
      layout: {
        'icon-image': 'lighthouse-15', // Use built-in or custom icon
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1]
      },
      paint: {
        'icon-color': '#FFFF00'
      }
    },

    // OBSTRUCTIONS (OBSTRN)
    {
      id: 'enc-obstrn-points',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'obstrn_points',
      minzoom: 8,
      paint: {
        'circle-radius': 4,
        'circle-color': '#FF0000',
        'circle-opacity': 0.7
      }
    },
    {
      id: 'enc-obstrn-polygons',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'obstrn_polygons',
      minzoom: 8,
      paint: {
        'fill-color': '#FF0000',
        'fill-opacity': 0.3,
        'fill-outline-color': '#CC0000'
      }
    },
    {
      id: 'enc-obstrn-lines',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'obstrn_lines',
      minzoom: 8,
      paint: {
        'line-color': '#FF0000',
        'line-width': 2,
        'line-dasharray': [3, 3]
      }
    },

    // WRECKS
    {
      id: 'enc-wrecks-points',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'wrecks_points',
      minzoom: 8,
      paint: {
        'circle-radius': 5,
        'circle-color': '#8B4513',
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    },
    {
      id: 'enc-wrecks-polygons',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'wrecks_polygons',
      minzoom: 8,
      paint: {
        'fill-color': '#8B4513',
        'fill-opacity': 0.5
      }
    },

    // UNDERWATER ROCKS (UWTROC)
    {
      id: 'enc-uwtroc',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'uwtroc',
      minzoom: 8,
      paint: {
        'circle-radius': 3,
        'circle-color': '#A0522D',
        'circle-opacity': 0.8
      }
    },

    // SOUNDINGS
    {
      id: 'enc-soundg',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'soundg',
      minzoom: 10,
      paint: {
        'circle-radius': 2,
        'circle-color': '#4B83B4',
        'circle-opacity': 0.6
      }
    },

    // RESTRICTED AREAS (RESARE)
    {
      id: 'enc-resare',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'resare',
      minzoom: 6,
      paint: {
        'fill-color': '#FF00FF',
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
      minzoom: 8,
      paint: {
        'fill-color': '#00FFFF',
        'fill-opacity': 0.3,
        'fill-outline-color': '#00CCCC'
      }
    },

    // BUILDINGS (BUISGL)
    {
      id: 'enc-buisgl-points',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'buisgl_points',
      minzoom: 10,
      paint: {
        'circle-radius': 3,
        'circle-color': '#808080'
      }
    },
    {
      id: 'enc-buisgl-polygons',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'buisgl_polygons',
      minzoom: 10,
      paint: {
        'fill-color': '#808080',
        'fill-opacity': 0.7,
        'fill-outline-color': '#404040'
      }
    },

    // LANDMARKS (LNDMRK)
    {
      id: 'enc-lndmrk',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'lndmrk_points',
      minzoom: 10,
      paint: {
        'circle-radius': 4,
        'circle-color': '#FFA500',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    },

    // TRAFFIC SEPARATION (TSSLPT, TSSBND)
    {
      id: 'enc-tsslpt',
      type: 'fill',
      source: 'active-basemap',
      'source-layer': 'tsslpt',
      minzoom: 6,
      paint: {
        'fill-color': '#FF00FF',
        'fill-opacity': 0.2,
        'fill-outline-color': '#CC00CC'
      }
    },
    {
      id: 'enc-tssbnd',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'tssbnd_lines',
      minzoom: 6,
      paint: {
        'line-color': '#FF00FF',
        'line-width': 2,
        'line-dasharray': [4, 2]
      }
    },

    // CABLES & PIPELINES (CBLSUB, PIPSOL)
    {
      id: 'enc-cblsub',
      type: 'line',
      source: 'active-basemap',
      'source-layer': 'cblsub_lines',
      minzoom: 8,
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
      minzoom: 8,
      paint: {
        'line-color': '#8B4513',
        'line-width': 1.5,
        'line-dasharray': [5, 3]
      }
    },

    // FOG SIGNALS (FOGSIG)
    {
      id: 'enc-fogsig',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'fogsig',
      minzoom: 10,
      paint: {
        'circle-radius': 4,
        'circle-color': '#808080',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    },

    // RADIO STATIONS (RDOSTA)
    {
      id: 'enc-rdosta',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'rdosta',
      minzoom: 10,
      paint: {
        'circle-radius': 4,
        'circle-color': '#0000FF',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1
      }
    },

    // TOPMARKS (TOPMAR)
    {
      id: 'enc-topmar',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'topmar',
      minzoom: 10,
      paint: {
        'circle-radius': 3,
        'circle-color': '#000000'
      }
    },

    // DAY MARKS (DAYMAR)
    {
      id: 'enc-daymar',
      type: 'circle',
      source: 'active-basemap',
      'source-layer': 'daymar',
      minzoom: 10,
      paint: {
        'circle-radius': 3,
        'circle-color': '#FFFF00',
        'circle-stroke-color': '#000000',
        'circle-stroke-width': 1
      }
    }
  ]
}
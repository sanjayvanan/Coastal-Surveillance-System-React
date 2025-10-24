import { getAutoEncLayers } from './autoEncLayers';


export const mapStyle = {
  version: 8,
  sources: {},
  layers: [{
    id: 'ocean',
    type: 'background',
    paint: {
      'background-color': '#1e3a8a'
    }
  }],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
}

/**
 * Get basemap layers synchronously
 * For ENC, returns empty array - ENC layers are loaded separately
 */
export function getBasemapLayers(basemapType) {
  const sourceId = 'active-basemap'
  
  switch (basemapType) {
    case 'maritime':
      return [
        {
          id: 'basemap-fill',
          type: 'fill',
          source: sourceId,
          'source-layer': 'basemap_low',
          paint: {
            'fill-color': ['interpolate', ['linear'], ['zoom'], 0, '#065f46', 6, '#047857', 10, '#059669', 14, '#10b981'],
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 8, 0.8, 18, 0.7]
          }
        },
        {
          id: 'basemap-stroke',
          type: 'line',
          source: sourceId,
          'source-layer': 'basemap_low',
          paint: {
            'line-color': '#064e3b',
            'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 1.5, 10, 2, 14, 2.5, 18, 3],
            'line-opacity': 1
          }
        }
      ]
    
    case 'enc':
      // Return static ENC layers as fallback
      // Smart layers loaded separately in MapComponent
      return getAutoEncLayers();
    
    case 'openstreetmap':
    case 'dark':
    case 'esriSatellite':
    case 'cartoDB':
    default:
      return [{
        id: 'basemap-raster',
        type: 'raster',
        source: sourceId,
        paint: { 
          'raster-opacity': 1, 
          'raster-fade-duration': 300 
        }
      }]
  }
}

/**
 * Get ENC layers asynchronously from S-52 rules
 * This loads the auto-generated layers from the parser
 */
export async function getEncLayersAsync() {
  try {
    const { getSmartEncLayers } = await import('./autoEncLayers')
    const layers = await getSmartEncLayers()
    console.log(`✅ Loaded ${layers.length} smart ENC layers from S-52 rules`)
    return layers
  } catch (error) {
    console.error('❌ Failed to load smart ENC layers:', error)
    // Fallback to static layers
    return getEncLayers()
  }
}

export function getOverlayLayers(layerVisibility) {
  return [
    {
      id: 'depare-fill',
      type: 'fill',
      source: 'vector-tiles',
      'source-layer': 'DEPARE-polygon',
      paint: {
        'fill-color': ['interpolate', ['linear'], ['zoom'], 0, '#1e40af', 6, '#2563eb', 10, '#3b82f6', 14, '#60a5fa'],
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 8, 0.5, 12, 0.6, 16, 0.7]
      },
      layout: { 'visibility': layerVisibility.depare ? 'visible' : 'none' }
    },
    {
      id: 'depare-stroke',
      type: 'line',
      source: 'vector-tiles',
      'source-layer': 'DEPARE-polygon',
      paint: {
        'line-color': '#1e3a8a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 0.8, 12, 1.2, 16, 2],
        'line-opacity': 0.8
      },
      layout: { 'visibility': layerVisibility.depare ? 'visible' : 'none' }
    },
    {
      id: 'lndare-fill',
      type: 'fill',
      source: 'vector-tiles',
      'source-layer': 'LNDARE',
      paint: {
        'fill-color': ['interpolate', ['linear'], ['zoom'], 0, '#16a34a', 8, '#15803d', 12, '#166534', 16, '#14532d'],
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 8, 0.8, 12, 0.85, 16, 0.9]
      },
      layout: { 'visibility': layerVisibility.lndare ? 'visible' : 'none' }
    },
    {
      id: 'lndare-stroke',
      type: 'line',
      source: 'vector-tiles',
      'source-layer': 'LNDARE',
      paint: {
        'line-color': '#052e16',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 1, 12, 1.5, 16, 2.5],
        'line-opacity': 1
      },
      layout: { 'visibility': layerVisibility.lndare ? 'visible' : 'none' }
    },
    {
      id: 'lndare-polygon-fill',
      type: 'fill',
      source: 'vector-tiles',
      'source-layer': 'LNDARE-polygon',
      paint: {
        'fill-color': ['interpolate', ['linear'], ['zoom'], 0, '#22c55e', 8, '#16a34a', 12, '#15803d', 16, '#166534'],
        'fill-opacity': 0.8
      },
      layout: { 'visibility': layerVisibility.lndarePolygon ? 'visible' : 'none' }
    },
    {
      id: 'lndare-polygon-stroke',
      type: 'line',
      source: 'vector-tiles',
      'source-layer': 'LNDARE-polygon',
      paint: {
        'line-color': '#052e16',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 8, 1, 12, 1.5, 16, 2.5],
        'line-opacity': 1
      },
      layout: { 'visibility': layerVisibility.lndarePolygon ? 'visible' : 'none' }
    }
  ]
}

export const satelliteLayer = (visible) => ({
  id: 'satellite-overlay',
  type: 'raster',
  source: 'satellite-tiles',
  paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 300 },
  layout: { 'visibility': visible ? 'visible' : 'none' }
})

export const marineNavigationLayer = (visible) => ({
  id: 'marine-navigation',
  type: 'raster',
  source: 'marine-navigation-tiles',
  paint: { 'raster-opacity': 1, 'raster-fade-duration': 300 },
  layout: { 'visibility': visible ? 'visible' : 'none' }
})
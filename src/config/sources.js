export const basemapSources = {
  maritime: {
    type: 'vector',
    tiles: ['http://localhost:8080/api/basemap-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 0,
    maxzoom: 18,
    attribution: 'Maritime Basemap'
  },
   enc: {
    type: 'vector',
    tiles: ['http://127.0.0.1:6767/enc/{z}/{x}/{y}.pbf'],
    minzoom: 4,  // From enc.json
    maxzoom: 12, // From enc.json
    bounds: [-98.116667, 17.791497, -76.1, 33.6085], // From enc.json
    attribution: 'Electronic Navigational Charts'
  },
  openstreetmap: {
    type: 'raster',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    minzoom: 0,
    maxzoom: 19,
    tileSize: 256,
    attribution: '© OpenStreetMap'
  },
  dark: {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    minzoom: 0,
    maxzoom: 16,
    tileSize: 256,
    attribution: '© Esri'
  },
  esriSatellite: {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    minzoom: 0,
    maxzoom: 19,
    tileSize: 256,
    attribution: '© Esri WorldImagery'
  },
  cartoDB: {
    type: 'raster',
    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
    minzoom: 0,
    maxzoom: 19,
    tileSize: 256,
    attribution: '© CartoDB'
  }
}

export const vectorSource = {
  type: 'vector',
  tiles: ['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt'],
  minzoom: 0,
  maxzoom: 18,
  attribution: 'OpenCPN Maritime Charts'
}

export const satelliteSource = {
  type: 'raster',
  tiles: ['http://localhost:8080/api/satellite-tiles/{z}/{x}/{y}'],
  minzoom: 9,
  maxzoom: 17,
  tileSize: 256,
  attribution: 'Sri Lanka CS2C Satellite (Z9-Z17)'
}

export const marineNavigationSource = {
  type: 'raster',
  tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
  minzoom: 0,
  maxzoom: 18,
  tileSize: 256,
  attribution: '© OpenSeaMap'
}
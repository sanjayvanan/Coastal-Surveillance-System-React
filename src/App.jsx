import React, { useState, useCallback, useMemo, useRef } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

export default function App() {
  const mapRef = useRef()
  const [mapLoaded, setMapLoaded] = useState(false)
  const [satelliteVisible, setSatelliteVisible] = useState(false)
  const [satelliteLoading, setSatelliteLoading] = useState(true)
  const [layerVisibility, setLayerVisibility] = useState({
    basemap: true,
    lndare: true,
    depare: true,
    lndarePolygon: true
  })
  
  // ✅ FIXED: Start at Sri Lanka coordinates
  const [viewState, setViewState] = useState({
    longitude: 80.7718, // Sri Lanka center
    latitude: 7.8731,   // Sri Lanka center  
    zoom: 7,            // Good overview zoom
    pitch: 0,
    bearing: 0
  })

  // ✅ ENHANCED: Ocean background first
  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{
      id: 'ocean',
      type: 'background',
      paint: { 
        'background-color': '#1e3a8a' // Deep ocean blue - always visible
      }
    }],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  }), [])

  // ✅ SEPARATE SOURCES: Basemap guaranteed coverage
  const basemapSource = useMemo(() => ({
    type: 'vector',
    tiles: ['http://localhost:8080/api/basemap-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 0,
    maxzoom: 18,
    attribution: 'Maritime Basemap'
  }), [])

  const vectorSource = useMemo(() => ({
    type: 'vector',
    tiles: ['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 0,
    maxzoom: 18,
    attribution: 'OpenCPN Maritime Charts'
  }), [])

  const satelliteSource = useMemo(() => ({
    type: 'raster',
    tiles: ['http://localhost:8080/api/satellite-tiles/{z}/{x}/{y}'],
    minzoom: 9,
    maxzoom: 17,
    tileSize: 256,
    attribution: 'Sri Lanka CS2C Satellite (Z9-Z17)'
  }), [])

  // ✅ FIXED: Basemap with correct source-layer name
  const basemapFillLayer = {
    id: 'basemap-fill',
    type: 'fill',
    source: 'basemap-tiles',
    'source-layer': 'basemap_low', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, '#065f46',  // Dark emerald
        6, '#047857',  // Emerald 
        10, '#059669', // Light emerald
        14, '#10b981'  // Bright emerald
      ],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.9,  // Strong visibility at all zooms
        8, 0.8,
        18, 0.7
      ]
    },
    layout: {
      'visibility': layerVisibility.basemap ? 'visible' : 'none'
    }
  }

  const basemapStrokeLayer = {
    id: 'basemap-stroke',
    type: 'line',
    source: 'basemap-tiles',
    'source-layer': 'basemap_low', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'line-color': '#064e3b', // Dark green coastline
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        6, 1.5,
        10, 2,
        14, 2.5,
        18, 3
      ],
      'line-opacity': 1
    },
    layout: {
      'visibility': layerVisibility.basemap ? 'visible' : 'none'
    }
  }

  // ✅ FIXED: LNDARE with correct source-layer name
  const lndareFillLayer = {
    id: 'lndare-fill',
    type: 'fill',
    source: 'vector-tiles',
    'source-layer': 'LNDARE', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, '#16a34a',  // Rich green
        8, '#15803d',  // Forest green
        12, '#166534', // Deep forest
        16, '#14532d'  // Very deep forest
      ],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.8,
        8, 0.85,
        12, 0.9,
        16, 0.95
      ]
    },
    layout: {
      'visibility': layerVisibility.lndare ? 'visible' : 'none'
    }
  }

  const lndareStrokeLayer = {
    id: 'lndare-stroke',
    type: 'line',
    source: 'vector-tiles',
    'source-layer': 'LNDARE', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'line-color': '#052e16', // Very dark green
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.5,
        8, 1,
        12, 1.5,
        16, 2.5
      ],
      'line-opacity': 1
    },
    layout: {
      'visibility': layerVisibility.lndare ? 'visible' : 'none'
    }
  }

  // ✅ FIXED: LNDARE-polygon with correct source-layer name
  const lndarePolygonFillLayer = {
    id: 'lndare-polygon-fill', 
    type: 'fill',
    source: 'vector-tiles',
    'source-layer': 'LNDARE-polygon', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, '#22c55e',  // Bright green
        8, '#16a34a',  // Medium green
        12, '#15803d', // Forest green
        16, '#166534'  // Deep forest
      ],
      'fill-opacity': 0.85
    },
    layout: {
      'visibility': layerVisibility.lndarePolygon ? 'visible' : 'none'
    }
  }

  const lndarePolygonStrokeLayer = {
    id: 'lndare-polygon-stroke',
    type: 'line',
    source: 'vector-tiles', 
    'source-layer': 'LNDARE-polygon', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'line-color': '#052e16',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.5,
        8, 1,
        12, 1.5,
        16, 2.5
      ],
      'line-opacity': 1
    },
    layout: {
      'visibility': layerVisibility.lndarePolygon ? 'visible' : 'none'
    }
  }

  // ✅ FIXED: DEPARE with correct source-layer name
  const depareFillLayer = {
    id: 'depare-fill',
    type: 'fill', 
    source: 'vector-tiles',
    'source-layer': 'DEPARE-polygon', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, '#1e40af',  // Deep blue
        6, '#2563eb',  // Blue
        10, '#3b82f6', // Light blue
        14, '#60a5fa'  // Lighter blue
      ],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.5,
        8, 0.6,
        12, 0.7,
        16, 0.8
      ]
    },
    layout: {
      'visibility': layerVisibility.depare ? 'visible' : 'none'
    }
  }

  const depareStrokeLayer = {
    id: 'depare-stroke',
    type: 'line',
    source: 'vector-tiles',
    'source-layer': 'DEPARE-polygon', // ✅ CORRECTED: matches ogrinfo output
    paint: {
      'line-color': '#1e3a8a', // Dark blue
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.5,
        8, 0.8,
        12, 1.2,
        16, 2
      ],
      'line-opacity': 0.9
    },
    layout: {
      'visibility': layerVisibility.depare ? 'visible' : 'none'
    }
  }

  const satelliteLayer = {
    id: 'satellite',
    type: 'raster',
    source: 'satellite-tiles',
    paint: {
      'raster-opacity': 0.85,
      'raster-fade-duration': 300
    },
    layout: {
      'visibility': satelliteVisible ? 'visible' : 'none'
    }
  }

  const handleViewStateChange = useCallback((evt) => {
    setViewState(evt.viewState)
  }, [])

  const handleMapLoad = useCallback(() => {
    console.log('✅ Professional maritime mapping system loaded')
    setMapLoaded(true)
    setTimeout(() => setSatelliteLoading(false), 3000)
    
    // ✅ DEBUG: Check map layers after load
    setTimeout(() => {
      const map = mapRef.current?.getMap()
      if (map) {
        const style = map.getStyle()
        console.log('🔍 Available sources:', Object.keys(style.sources))
        console.log('🔍 Available layers:', style.layers.map(l => l.id))
      }
    }, 2000)
  }, [])

  const handleSourceError = useCallback((event) => {
    console.warn('⚠️ Tile loading issue:', event)
  }, [])

  const toggleSatellite = useCallback(() => {
    setSatelliteVisible(prev => !prev)
  }, [])

  const toggleLayer = useCallback((layerName) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }))
  }, [])

  // ✅ FIXED: Sri Lankan locations with correct coordinates
  const locations = [
    { name: '🏝️ Sri Lanka Overview', lng: 80.7718, lat: 7.8731, zoom: 7 },
    { name: '🏙️ Colombo Port', lng: 79.8612, lat: 6.9271, zoom: 12 },
    { name: '🌊 Southern Province', lng: 80.63, lat: 6.05, zoom: 10 },
    { name: '⚓ Galle Harbor', lng: 80.217, lat: 6.033, zoom: 14 },
    { name: '🏔️ Central Highlands', lng: 80.77, lat: 7.29, zoom: 11 },
    { name: '🎯 Trincomalee', lng: 81.21, lat: 8.59, zoom: 12 }
  ]

  const navigateTo = useCallback((location) => {
    setViewState(prev => ({
      ...prev,
      longitude: location.lng,
      latitude: location.lat,
      zoom: location.zoom
    }))
  }, [])

  const resetToSriLanka = useCallback(() => {
    setViewState({
      longitude: 80.7718,
      latitude: 7.8731,
      zoom: 7,
      pitch: 0,
      bearing: 0
    })
  }, [])

  const satelliteAvailable = viewState.zoom >= 9
  const activeLayerCount = Object.values(layerVisibility).filter(Boolean).length

  return (
    <div className="mapping-app">
      {/* Status Panel */}
      <div className="status-panel">
        <div className="panel-header">
          🗺️ <strong>Professional Maritime Mapping System</strong>
        </div>
        <div className="status-grid">
          <div>📍 <strong>Position:</strong> {viewState.longitude.toFixed(4)}°, {viewState.latitude.toFixed(4)}°</div>
          <div>🔍 <strong>Zoom:</strong> {viewState.zoom.toFixed(2)} / 17</div>
          <div>⚡ <strong>Status:</strong> {mapLoaded ? '✅ Active' : '⏳ Loading...'}</div>
          <div>🗺️ <strong>Layers:</strong> {activeLayerCount}/4 Active</div>
          <div>🛰️ <strong>Satellite:</strong> {
            satelliteLoading ? '⏳ Loading...' :
            !satelliteVisible ? '❌ Off' :
            !satelliteAvailable ? '⚠️ On (Zoom ≥9 needed)' :
            '✅ Active'
          }</div>
          <div>📊 <strong>Region:</strong> {
            viewState.longitude > 79 && viewState.longitude < 82 && 
            viewState.latitude > 5.5 && viewState.latitude < 10 
              ? 'Sri Lanka Waters' 
              : '⚠️ Outside Sri Lanka'
          }</div>
        </div>
      </div>

      {/* Enhanced Controls Panel */}
      <div className="controls-panel">
        {/* Quick Reset Button */}
        <div className="control-section">
          <button
            onClick={resetToSriLanka}
            className="reset-button"
          >
            🇱🇰 Reset to Sri Lanka
          </button>
        </div>

        {/* Maritime Layer Controls */}
        <div className="control-section">
          <div className="section-title">🗺️ Maritime Layers</div>
          <div className="layer-controls">
            <button
              onClick={() => toggleLayer('basemap')}
              className={`layer-toggle ${layerVisibility.basemap ? 'active' : ''}`}
            >
              🟢 Basemap {layerVisibility.basemap ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => toggleLayer('lndare')}
              className={`layer-toggle ${layerVisibility.lndare ? 'active' : ''}`}
            >
              🏞️ Land Areas {layerVisibility.lndare ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => toggleLayer('lndarePolygon')}
              className={`layer-toggle ${layerVisibility.lndarePolygon ? 'active' : ''}`}
            >
              🗾 Land Polygons {layerVisibility.lndarePolygon ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => toggleLayer('depare')}
              className={`layer-toggle ${layerVisibility.depare ? 'active' : ''}`}
            >
              🌊 Depth Areas {layerVisibility.depare ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Satellite Controls */}
        <div className="control-section">
          <div className="section-title">🛰️ Satellite Overlay</div>
          <button
            onClick={toggleSatellite}
            disabled={satelliteLoading}
            className={`satellite-toggle ${satelliteVisible ? 'active' : ''}`}
          >
            {satelliteVisible ? 'ON' : 'OFF'}
          </button>
          <div className="help-text">
            {!satelliteAvailable ? '⚠️ Available at zoom ≥9' : '✅ Satellite ready'}
          </div>
        </div>

        {/* Navigation */}
        <div className="control-section">
          <div className="section-title">📍 Quick Navigation</div>
          <div className="nav-buttons">
            {locations.map((loc, idx) => (
              <button 
                key={idx} 
                onClick={() => navigateTo(loc)}
                className="nav-button"
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="control-section">
          <div className="section-title">🔍 Zoom Controls</div>
          <div className="zoom-controls">
            <button 
              onClick={() => setViewState(prev => ({...prev, zoom: Math.min(17, prev.zoom + 1)}))}
              className="zoom-button"
            >
              ➕ In
            </button>
            <button 
              onClick={() => setViewState(prev => ({...prev, zoom: Math.max(0, prev.zoom - 1)}))}
              className="zoom-button"
            >
              ➖ Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Map */}
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={mapStyle}
        minZoom={0}
        maxZoom={17}
        antialias={true}
        attributionControl={false}
      >
        {mapLoaded && (
          <>
            {/* ✅ SEPARATE BASEMAP SOURCE - Always renders bottom layer */}
            <Source
              id="basemap-tiles"
              {...basemapSource}
              onError={handleSourceError}
            >
              <Layer {...basemapFillLayer} />
              <Layer {...basemapStrokeLayer} />
            </Source>

            {/* ✅ ENHANCEMENT LAYERS - Render on top */}
            <Source
              id="vector-tiles"
              {...vectorSource}
              onError={handleSourceError}
            >
              {/* Depth areas first (middle layer) */}
              <Layer {...depareFillLayer} />
              <Layer {...depareStrokeLayer} />
              
              {/* Land areas on top */}
              <Layer {...lndareFillLayer} />
              <Layer {...lndareStrokeLayer} />
              <Layer {...lndarePolygonFillLayer} />
              <Layer {...lndarePolygonStrokeLayer} />
            </Source>

            {/* Satellite overlay - top most when enabled */}
            <Source
              id="satellite-tiles"
              {...satelliteSource}
              onError={handleSourceError}
            >
              <Layer {...satelliteLayer} />
            </Source>
          </>
        )}
      </ReactMapGL>

      {/* Footer */}
      <div className="footer-info">
        🎯 Maritime Navigation System | Sri Lanka Waters | 
        Layers: {activeLayerCount}/4 Active | 
        {satelliteVisible && satelliteAvailable ? ' 🛰️ Full Coverage' : ' 🗺️ Vector Charts'}
      </div>
    </div>
  )
}

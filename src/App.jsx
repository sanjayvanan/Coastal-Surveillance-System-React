import React, { useState, useCallback, useMemo } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

export default function App() {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [satelliteVisible, setSatelliteVisible] = useState(false)
  const [satelliteLoading, setSatelliteLoading] = useState(true)
  const [viewState, setViewState] = useState({
    longitude: 80.7718,
    latitude: 7.8731,
    zoom: 12,
    pitch: 0,
    bearing: 0
  })

  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#1a365d' }
    }],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  }), [])

  // Vector tiles source (zoom 0-12) - BASE LAYER
  const vectorSource = useMemo(() => ({
    type: 'vector',
    tiles: ['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 0,
    maxzoom: 12,
    attribution: 'OpenCPN Maritime Charts'
  }), [])

  // Satellite tiles source (zoom 9-17) - OVERLAY LAYER
  const satelliteSource = useMemo(() => ({
    type: 'raster',
    tiles: ['http://localhost:8080/api/satellite-tiles/{z}/{x}/{y}'],
    minzoom: 9,
    maxzoom: 17,
    tileSize: 256,
    attribution: 'Sri Lanka CS2C Satellite (Z9-Z17)'
  }), [])

  // Vector base layer styling - consistent
  const basemapLayer = {
    id: 'basemap-fill',
    type: 'fill',
    source: 'vector-tiles',
    'source-layer': 'basemap_low',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, '#059669',
        8, '#10b981', 
        12, '#22c55e'
      ],
      'fill-opacity': 0.85,
      'fill-antialias': true
    }
  }

  const basemapStroke = {
    id: 'basemap-stroke',
    type: 'line',
    source: 'vector-tiles',
    'source-layer': 'basemap_low',
    paint: {
      'line-color': '#047857',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 0.3,
        6, 0.8,
        9, 1.2,
        12, 1.8,
        17, 2.5
      ],
      'line-opacity': 0.9
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  }

  // Satellite overlay layer
  const satelliteLayer = {
    id: 'satellite',
    type: 'raster',
    source: 'satellite-tiles',
    paint: {
      'raster-opacity': 1.0,
      'raster-fade-duration': 300,
      'raster-brightness-min': 0,
      'raster-brightness-max': 1,
      'raster-contrast': 0.1,
      'raster-saturation': 0.1
    },
    layout: {
      'visibility': satelliteVisible ? 'visible' : 'none'
    }
  }

  const handleViewStateChange = useCallback((evt) => {
    setViewState(evt.viewState)
  }, [])

  const handleMapLoad = useCallback(() => {
    console.log('✅ Professional mapping system loaded')
    setMapLoaded(true)
    
    // Check satellite availability after 3 seconds
    setTimeout(() => {
      setSatelliteLoading(false)
    }, 3000)
  }, [])

  const handleSourceError = useCallback((event) => {
    console.warn('⚠️ Tile loading issue:', event)
    if (event.sourceId === 'satellite-tiles') {
      setSatelliteLoading(false)
    }
  }, [])

  // ✅ FIXED: Simple toggle - works at any zoom level
  const toggleSatellite = useCallback(() => {
    setSatelliteVisible(prev => {
      const newValue = !prev
      console.log(`🛰️ Satellite overlay: ${newValue ? 'ON' : 'OFF'} at zoom ${viewState.zoom.toFixed(1)}`)
      return newValue
    })
  }, [viewState.zoom])

  // Navigation presets
  const locations = [
    { name: '🏝️ Sri Lanka Overview', lng: 80.7718, lat: 7.8731, zoom: 8 },
    { name: '🏙️ Colombo (Satellite)', lng: 79.8612, lat: 6.9271, zoom: 14 },
    { name: '🌊 South Coast (Satellite)', lng: 80.2, lat: 6.0, zoom: 12 },
    { name: '🏔️ Central Highlands', lng: 80.7, lat: 7.3, zoom: 13 },
    { name: '⚓ Galle Port', lng: 80.217, lat: 6.033, zoom: 15 },
    { name: '🎯 Regional View', lng: 78.9629, lat: 20.5937, zoom: 6 }
  ]

  const navigateTo = useCallback((location) => {
    setViewState(prev => ({
      ...prev,
      longitude: location.lng,
      latitude: location.lat,
      zoom: location.zoom
    }))
  }, [])

  // ✅ FIXED: Check if satellite tiles are available at current zoom
  const satelliteAvailable = viewState.zoom >= 9
  const satelliteEffective = satelliteVisible && satelliteAvailable

  return (
    <div className="mapping-app">
      {/* Main Status Panel */}
      <div className="status-panel">
        <div className="panel-header">
          🗺️ <strong>Professional Maritime Mapping</strong>
        </div>
        <div className="status-grid">
          <div>📍 <strong>Position:</strong> {viewState.longitude.toFixed(4)}°, {viewState.latitude.toFixed(4)}°</div>
          <div>🔍 <strong>Zoom:</strong> {viewState.zoom.toFixed(2)} / 17</div>
          <div>⚡ <strong>Status:</strong> {mapLoaded ? '✅ Active' : '⏳ Loading...'}</div>
          <div>🛰️ <strong>Satellite:</strong> {
            satelliteLoading ? '⏳ Loading...' :
            !satelliteVisible ? '❌ Off' :
            !satelliteAvailable ? '⚠️ On (No tiles at this zoom)' :
            '✅ On (Active)'
          }</div>
          <div>📊 <strong>Coverage:</strong> Vector(0-12) | Satellite(9-17)</div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="controls-panel">
        {/* ✅ FIXED: Satellite Toggle - always enabled */}
        <div className="control-section">
          <div className="section-title">🛰️ Satellite Overlay</div>
          <button
            onClick={toggleSatellite}
            disabled={satelliteLoading}  // Only disabled while loading
            className={`satellite-toggle ${satelliteVisible ? 'active' : ''} ${
              satelliteLoading ? 'disabled' : ''
            }`}
          >
            {satelliteLoading ? 'Loading...' : 
             satelliteVisible ? 'ON' : 'OFF'}
          </button>
          <div className="help-text">
            {satelliteLoading ? '⏳ Initializing satellite tiles...' :
             !satelliteVisible ? '🗺️ Vector tiles only' :
             !satelliteAvailable ? '⚠️ Satellite on but no tiles at zoom < 9' :
             '🛰️ Satellite overlay active'}
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
          <div className="zoom-info">
            Current: {viewState.zoom.toFixed(1)} | 
            {viewState.zoom < 9 ? ' Vector Only Zone' : 
             satelliteEffective ? ' Vector + Satellite' : 
             satelliteVisible ? ' Vector + Satellite (Ready)' :
             ' Vector Only'}
          </div>
        </div>

        {/* Quick Zoom Levels */}
        <div className="control-section">
          <div className="section-title">🎯 Quick Zoom</div>
          <div className="quick-zoom">
            <button onClick={() => setViewState(prev => ({...prev, zoom: 6}))} className="quick-zoom-btn">
              🌍 Overview (6)
            </button>
            <button onClick={() => setViewState(prev => ({...prev, zoom: 9}))} className="quick-zoom-btn">
              🏞️ Regional (9)
            </button>
            <button onClick={() => setViewState(prev => ({...prev, zoom: 12}))} className="quick-zoom-btn">
              🛰️ Satellite (12)
            </button>
            <button onClick={() => setViewState(prev => ({...prev, zoom: 15}))} className="quick-zoom-btn">
              🔍 Detail (15)
            </button>
          </div>
        </div>
      </div>

      {/* Main Map */}
      <ReactMapGL
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={mapStyle}
        minZoom={0}
        maxZoom={17}
        antialias={true}
        attributionControl={false}
        logoPosition="bottom-right"
      >
        {mapLoaded && (
          <>
            {/* Vector Base Layer (always rendered) */}
            <Source
              id="vector-tiles"
              {...vectorSource}
              onError={handleSourceError}
            >
              <Layer {...basemapLayer} />
              <Layer {...basemapStroke} />
            </Source>

            {/* Satellite Overlay Layer (conditionally rendered) */}
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
        🎯 Maritime Navigation System | 
        {satelliteEffective ? ' 🛰️ Vector + Satellite Active' : 
         satelliteVisible ? ' 🛰️ Vector + Satellite (Standby)' : 
         ' 🗺️ Vector Only'} | 
        Z{viewState.zoom.toFixed(0)}: {
          viewState.zoom < 9 ? 'Vector Zone' :
          satelliteEffective ? 'Full Coverage' :
          'Satellite Zone'
        }
      </div>
    </div>
  )
}

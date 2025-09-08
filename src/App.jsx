import React, { useState, useCallback, useMemo } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

export default function App() {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewState, setViewState] = useState({
    longitude: 78.9629,
    latitude: 20.5937,
    zoom: 6,
    pitch: 0,
    bearing: 0
  })

  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 
        'background-color': '#1e3a8a' // Dark blue ocean
      }
    }],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  }), [])

  const vectorSource = useMemo(() => ({
    type: 'vector',
    tiles: ['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 0,
    maxzoom: 12,
    attribution: 'OpenCPN Basemap'
  }), [])

  // ✅ FIXED: Use the correct source-layer name from ogrinfo output
  const basemapLayer = {
    id: 'basemap-low-fill',
    type: 'fill',
    source: 'vector-tiles',
    'source-layer': 'basemap_low', // ✅ CORRECTED: underscore instead of dash
    paint: {
      'fill-color': '#22c55e', // Green for land areas
      'fill-opacity': 0.8,
      'fill-antialias': true
    }
  }

  const basemapStroke = {
    id: 'basemap-low-stroke',
    type: 'line',
    source: 'vector-tiles',
    'source-layer': 'basemap_low', // ✅ CORRECTED: underscore instead of dash
    paint: {
      'line-color': '#16a34a', // Darker green for borders
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.5,
        8, 1.5
      ],
      'line-opacity': 0.9
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  }

  const handleViewStateChange = useCallback((evt) => {
    setViewState(evt.viewState)
  }, [])

  const handleMapLoad = useCallback(() => {
    console.log('✅ Map loaded - ready for OpenCPN basemap tiles')
    setMapLoaded(true)
  }, [])

  const handleSourceError = useCallback((event) => {
    console.error('❌ Tile error:', event)
  }, [])

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      {/* Status panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <div>🗺️ <strong>OpenCPN Coastal Basemap</strong></div>
        <div>📍 Zoom: {viewState.zoom.toFixed(1)}</div>
        <div>⚡ Status: {mapLoaded ? '✅ Ready' : '⏳ Loading...'}</div>
        <div>🎯 Layer: basemap_low (41,644 tiles)</div>
      </div>

      {/* Navigation controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '5px',
        borderRadius: '5px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }}>
        <button 
          onClick={() => setViewState(prev => ({...prev, zoom: Math.min(8, prev.zoom + 0.5)}))}
          style={{
            background: '#374151',
            border: 'none',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          ➕ Zoom In
        </button>
        <button 
          onClick={() => setViewState(prev => ({...prev, zoom: Math.max(5, prev.zoom - 0.5)}))}
          style={{
            background: '#374151',
            border: 'none',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          ➖ Zoom Out
        </button>
        <button 
          onClick={() => setViewState(prev => ({
            ...prev,
            longitude: 78.9629,
            latitude: 20.5937,
            zoom: 6
          }))}
          style={{
            background: '#374151',
            border: 'none',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🏠 Center
        </button>
      </div>

      <ReactMapGL
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={mapStyle}
        minZoom={0}
        maxZoom={12}
        antialias={true}
        attributionControl={false}
      >
        {mapLoaded && (
          <Source
            id="vector-tiles"
            {...vectorSource}
            onError={handleSourceError}
          >
            <Layer {...basemapLayer} />
            <Layer {...basemapStroke} />
          </Source>
        )}
      </ReactMapGL>

      {/* Footer info */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        🎯 OpenCPN Coastal Basemap | Qt Backend: ✅ Active | PBF Tiles: ✅ Ready | Layer: basemap_low
      </div>
    </div>
  )
}

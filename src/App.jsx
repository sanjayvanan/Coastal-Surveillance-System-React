import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

// Production mode detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const DEBUG_ENABLED = !IS_PRODUCTION && window.location.search.includes('debug')

// Performance utilities
const useThrottledCallback = (callback, delay) => {
  const lastCall = useRef(0)
  
  return useCallback((...args) => {
    const now = Date.now()
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      callback(...args)
    }
  }, [callback, delay])
}

// Memoized layer configurations
const LayerConfigurations = React.memo(({ layers, selectedLayers }) => {
  const layerElements = useMemo(() => {
    return layers
      .filter(layer => !['base', 'lndare'].includes(layer.name))
      .slice(0, 10) // Limit to 10 custom layers for performance
      .map((layer, index) => {
        if (!selectedLayers.includes(layer.name)) return null
        
        const hue = (index * 137.508) % 360
        const fillColor = `hsl(${hue}, 70%, 50%)`
        const strokeColor = `hsl(${hue}, 80%, 40%)`
        
        return (
          <React.Fragment key={layer.name}>
            {layer.polygonCount > 0 && (
              <>
                <Layer
                  id={`${layer.name}-fill`}
                  type="fill"
                  source="shapefile-mvt"
                  source-layer={layer.name}
                  paint={{
                    'fill-color': fillColor,
                    'fill-opacity': 0.5
                  }}
                />
                <Layer
                  id={`${layer.name}-stroke`}
                  type="line"
                  source="shapefile-mvt"
                  source-layer={layer.name}
                  paint={{
                    'line-color': strokeColor,
                    'line-width': 1,
                    'line-opacity': 0.8
                  }}
                />
              </>
            )}
            
            {layer.pointCount > 0 && (
              <Layer
                id={`${layer.name}-points`}
                type="circle"
                source="shapefile-mvt"
                source-layer={layer.name}
                paint={{
                  'circle-color': fillColor,
                  'circle-radius': 4,
                  'circle-opacity': 0.8,
                  'circle-stroke-color': strokeColor,
                  'circle-stroke-width': 1
                }}
              />
            )}
          </React.Fragment>
        )
      })
      .filter(Boolean)
  }, [layers, selectedLayers])
  
  return <>{layerElements}</>
})

LayerConfigurations.displayName = 'LayerConfigurations'

export default function App() {
  const [mapBounds, setMapBounds] = useState(null)
  const [layers, setLayers] = useState([])
  const [vectorTileStats, setVectorTileStats] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 6,
    pitch: 0,
    bearing: 0
  })
  const [selectedLayers, setSelectedLayers] = useState(['base', 'lndare'])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [serverStatus, setServerStatus] = useState('unknown')

  // Performance tracking - FIXED: Use native Map constructor
  const lastLogTime = useRef(0)
  const tileTestCache = useRef(new globalThis.Map()) // ✅ Use globalThis.Map to avoid conflict
  const performanceMetrics = useRef({
    tileRequests: 0,
    errors: 0,
    lastUpdate: Date.now()
  })

  // Optimized debug logging
  const addDebugLog = useCallback((message, level = 'info') => {
    if (IS_PRODUCTION && level !== 'error') return
    
    const now = Date.now()
    if (level === 'move' && now - lastLogTime.current < 1000) return
    
    if (level === 'move') lastLogTime.current = now
    
    if (DEBUG_ENABLED || level === 'error') {
      console.log(message)
      setDebugInfo(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`])
    }
  }, [])

  // Throttled view state change handler
  const handleViewStateChange = useThrottledCallback((evt) => {
    setViewState(evt.viewState)
    
    if (DEBUG_ENABLED) {
      const zoom = evt.viewState.zoom
      if (zoom < 5 || zoom > 8) {
        addDebugLog(`⚠️ Zoom ${zoom.toFixed(1)} outside optimal range 5-8`, 'move')
      }
    }
  }, 150) // Throttle to 150ms for smooth interaction

  // Server connection test
  const testServerConnection = useCallback(async () => {
    try {
      addDebugLog('🔍 Testing server...', 'info')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('http://localhost:8080/api/bounds', {
        signal: controller.signal,
        cache: 'no-cache'
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        addDebugLog('✅ Server connected', 'info')
        setServerStatus('connected')
        return true
      } else {
        addDebugLog(`❌ Server error: ${response.status}`, 'error')
        setServerStatus('error')
        return false
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        addDebugLog('⏰ Server timeout', 'error')
      } else {
        addDebugLog(`❌ Connection failed: ${error.message}`, 'error')
      }
      setServerStatus('disconnected')
      return false
    }
  }, [addDebugLog])

  // Optimized data fetching
  useEffect(() => {
    const fetchMapData = async () => {
      const startTime = performance.now()
      
      try {
        addDebugLog('🔍 Fetching data...', 'info')
        
        const serverOk = await testServerConnection()
        if (!serverOk) {
          setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
          setViewState(prev => ({ ...prev, longitude: 0, latitude: 0 }))
          return
        }
        
        // Parallel requests for better performance
        const [boundsRes, layersRes, metadataRes] = await Promise.allSettled([
          fetch('http://localhost:8080/api/bounds'),
          fetch('http://localhost:8080/api/layers'),
          fetch('http://localhost:8080/api/vector-tiles/metadata')
        ])
        
        if (boundsRes.status === 'fulfilled' && boundsRes.value.ok) {
          const bounds = await boundsRes.value.json()
          setMapBounds(bounds)
          setViewState(prev => ({
            ...prev,
            longitude: (bounds.minX + bounds.maxX) / 2,
            latitude: (bounds.minY + bounds.maxY) / 2
          }))
        }

        if (layersRes.status === 'fulfilled' && layersRes.value.ok) {
          const layersData = await layersRes.value.json()
          setLayers(layersData.layers || [])
        }

        if (metadataRes.status === 'fulfilled' && metadataRes.value.ok) {
          const metadata = await metadataRes.value.json()
          setVectorTileStats(metadata)
        }

        const loadTime = performance.now() - startTime
        if (DEBUG_ENABLED) {
          addDebugLog(`⚡ Loaded in ${loadTime.toFixed(0)}ms`, 'info')
        }

      } catch (error) {
        addDebugLog(`❌ Fatal error: ${error.message}`, 'error')
        setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
      }
    }

    fetchMapData()
  }, [testServerConnection, addDebugLog])

  // Layer toggle
  const toggleLayer = useCallback((layerName) => {
    setSelectedLayers(prev => {
      const isVisible = prev.includes(layerName)
      const newLayers = isVisible 
        ? prev.filter(name => name !== layerName)
        : [...prev, layerName]
      
      if (DEBUG_ENABLED) {
        addDebugLog(`🔄 ${isVisible ? 'Hidden' : 'Shown'}: ${layerName}`, 'info')
      }
      
      return newLayers
    })
  }, [addDebugLog])

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true)
    addDebugLog('✅ Map ready', 'info')
  }, [addDebugLog])

  const handleMapError = useCallback((event) => {
    performanceMetrics.current.errors++
    const errorMessage = event.error?.message || 'Unknown error'
    addDebugLog(`❌ Map error: ${errorMessage}`, 'error')
    
    if (DEBUG_ENABLED) {
      console.error('Full error:', event)
    }
  }, [addDebugLog])

  // Cached tile testing
  const testTile = useCallback(async (z, x, y) => {
    const tileKey = `${z}/${x}/${y}`
    
    if (tileTestCache.current.has(tileKey)) {
      const cached = tileTestCache.current.get(tileKey)
      addDebugLog(`📋 Cached: ${tileKey} - ${cached.status}`, 'info')
      return
    }
    
    try {
      const response = await fetch(`http://localhost:8080/api/vector-tiles/${z}/${x}/${y}.mvt`)
      const result = {
        status: response.ok ? 'OK' : `Error ${response.status}`,
        size: response.ok ? (await response.arrayBuffer()).byteLength : 0,
        timestamp: Date.now()
      }
      
      tileTestCache.current.set(tileKey, result)
      setTimeout(() => tileTestCache.current.delete(tileKey), 30000)
      
      addDebugLog(`🧪 ${tileKey}: ${result.status} (${result.size}B)`, 'info')
      
    } catch (error) {
      addDebugLog(`❌ ${tileKey}: ${error.message}`, 'error')
    }
  }, [addDebugLog])

  // Memoized map style
  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f0f8ff' }
    }]
  }), [])

  // Memoized base layers
  const baseLayers = useMemo(() => (
    <>
      {selectedLayers.includes('base') && (
        <>
          <Layer
            id="base-fill"
            type="fill"
            source="shapefile-mvt"
            source-layer="base"
            paint={{
              'fill-color': '#4A90E2',
              'fill-opacity': 0.6
            }}
          />
          <Layer
            id="base-stroke"
            type="line"
            source="shapefile-mvt"
            source-layer="base"
            paint={{
              'line-color': '#2171B5',
              'line-width': 1,
              'line-opacity': 0.8
            }}
          />
        </>
      )}

      {selectedLayers.includes('lndare') && (
        <>
          <Layer
            id="lndare-fill"
            type="fill"
            source="shapefile-mvt"
            source-layer="lndare"
            paint={{
              'fill-color': '#228B22',
              'fill-opacity': 0.7
            }}
          />
          <Layer
            id="lndare-stroke"
            type="line"
            source="shapefile-mvt"
            source-layer="lndare"
            paint={{
              'line-color': '#006400',
              'line-width': 1,
              'line-opacity': 0.9
            }}
          />
        </>
      )}
    </>
  ), [selectedLayers])

  if (!mapBounds) {
    return (
      <div className="app">
        <div className="loading">
          <h3>🔄 Loading...</h3>
          {!IS_PRODUCTION && <p>Status: {serverStatus}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <ReactMapGL
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        onError={handleMapError}
        style={{
          width: IS_PRODUCTION ? '100vw' : 'calc(100vw - 400px)',
          height: '100vh'
        }}
        mapStyle={mapStyle}
        minZoom={1}
        maxZoom={12}
        reuseMaps
        RTLTextPlugin={false}
      >
        {mapLoaded && serverStatus === 'connected' && (
          <Source
            id="shapefile-mvt"
            type="vector"
            tiles={['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt']}
            minzoom={5}
            maxzoom={8}
          >
            {baseLayers}
            <LayerConfigurations layers={layers} selectedLayers={selectedLayers} />
          </Source>
        )}
      </ReactMapGL>
      
      {!IS_PRODUCTION && (
        <div className="debug-panel">
          <h3>🚀 Production MVT</h3>
          
          <div className="server-status">
            <h4>🌐 Server</h4>
            <p style={{color: serverStatus === 'connected' ? 'green' : 'red'}}>
              {serverStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </p>
          </div>
          
          {vectorTileStats && (
            <div className="stats">
              <h4>⚡ Performance</h4>
              <p>🎯 MVT Format</p>
              <p>📦 {vectorTileStats.totalTiles} tiles</p>
              <p>📈 Zoom: {vectorTileStats.minZoom}-{vectorTileStats.maxZoom}</p>
              <p>⚠️ Errors: {performanceMetrics.current.errors}</p>
            </div>
          )}

          <div className="layer-controls">
            <h4>🎛️ Layers</h4>
            <div className="layer-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={selectedLayers.includes('base')}
                  onChange={() => toggleLayer('base')}
                />
                🔵 Base
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedLayers.includes('lndare')}
                  onChange={() => toggleLayer('lndare')}
                />
                🟢 LNDARE
              </label>
              {layers.slice(0, 5).map(layer => (
                <label key={layer.name}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(layer.name)}
                    onChange={() => toggleLayer(layer.name)}
                  />
                  🟡 {layer.name}
                </label>
              ))}
            </div>
          </div>

          <div className="performance-controls">
            <h4>🧪 Tools</h4>
            <div className="button-grid">
              <button onClick={() => testTile(6, 32, 32)}>Test Tile</button>
              <button onClick={() => {
                tileTestCache.current.clear()
                addDebugLog('🗑️ Cache cleared', 'info')
              }}>
                Clear Cache
              </button>
            </div>
          </div>

          {DEBUG_ENABLED && (
            <div className="debug-log">
              <h4>📋 Debug</h4>
              <div className="log-content">
                {debugInfo.slice(-8).map((log, i) => (
                  <div key={i} className="log-entry">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

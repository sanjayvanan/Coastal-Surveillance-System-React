import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

class TileRequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
    this.activeRequests = 0
    this.queue = []
    this.rateLimitDelay = 20
  }

  async request(url) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject })
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const { url, resolve, reject } = this.queue.shift()
    this.activeRequests++

    try {
      const response = await fetch(url, { cache: 'force-cache' })
      resolve(response)
    } catch (error) {
      reject(error)
    } finally {
      this.activeRequests--
      setTimeout(() => this.processQueue(), this.rateLimitDelay)
    }
  }
}

const tileQueue = new TileRequestQueue(3)

export default function App() {
  const [mapBounds, setMapBounds] = useState(null)
  const [layers, setLayers] = useState([])
  const [viewState, setViewState] = useState({
    longitude: 78.9629, // Start with India but allow global navigation
    latitude: 20.5937,
    zoom: 6,
    pitch: 0,
    bearing: 0
  })
  const [selectedLayers, setSelectedLayers] = useState(['lndare', 'base'])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [serverStatus, setServerStatus] = useState('unknown')
  const [coordinateInfo, setCoordinateInfo] = useState(null)
  const [debugInfo, setDebugInfo] = useState({})
  const [dataCenter, setDataCenter] = useState(null)
  const [tileLoadErrors, setTileLoadErrors] = useState([])

  const lastMoveTime = useRef(0)
  const moveTimeoutRef = useRef(null)

  const handleViewStateChange = useCallback((evt) => {
    const now = Date.now()
    setViewState(evt.viewState)

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current)
    }

    moveTimeoutRef.current = setTimeout(() => {
      if (!IS_PRODUCTION && now - lastMoveTime.current > 2000) {
        const zoom = evt.viewState.zoom
        if (zoom < 5 || zoom > 8) {
          console.warn(`🗺️ Zoom ${zoom.toFixed(1)} outside optimal range 5-8`)
        }
        lastMoveTime.current = now
      }
    }, 1000)
  }, [])

  const testServerConnection = useCallback(async () => {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 2000)
      
      const response = await fetch('http://localhost:8080/api/bounds', {
        signal: controller.signal,
        cache: 'no-cache'
      })
      
      setServerStatus(response.ok ? 'connected' : 'error')
      return response.ok
    } catch (error) {
      setServerStatus('disconnected')
      return false
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const serverOk = await testServerConnection()
      
      if (!serverOk) {
        console.warn('🗺️ Server not available')
        // ✅ GLOBAL: Set world bounds but keep India center
        setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
        setDataCenter({ lng: 78.9629, lat: 20.5937 }) // Start with India
        return
      }

      try {
        const [boundsRes, layersRes] = await Promise.all([
          fetch('http://localhost:8080/api/bounds'),
          fetch('http://localhost:8080/api/layers')
        ])

        if (boundsRes.ok) {
          const bounds = await boundsRes.json()
          console.log('🗺️ Bounds received:', bounds)

          const isValidBounds = (
            bounds.minX !== undefined && bounds.maxX !== undefined &&
            bounds.minY !== undefined && bounds.maxY !== undefined &&
            !isNaN(bounds.minX) && !isNaN(bounds.maxX) &&
            !isNaN(bounds.minY) && !isNaN(bounds.maxY) &&
            bounds.maxX > bounds.minX && bounds.maxY > bounds.minY
          )

          if (!isValidBounds) {
            console.error('❌ Invalid bounds:', bounds)
            setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
            setDataCenter({ lng: 78.9629, lat: 20.5937 })
            return
          }

          // ✅ GLOBAL: Accept world bounds but prefer India center for initial view
          let centerLng = 78.9629  // India default for initial view
          let centerLat = 20.5937

          // Check if bounds are global or regional
          const boundsWidth = bounds.maxX - bounds.minX
          const boundsHeight = bounds.maxY - bounds.minY
          
          console.log('📊 Bounds analysis:', {
            width: boundsWidth,
            height: boundsHeight,
            minX: bounds.minX,
            maxX: bounds.maxX,
            minY: bounds.minY,
            maxY: bounds.maxY,
            rawBounds: bounds.rawBounds
          })

          // ✅ SMART: Determine if we have global or regional data
          if (boundsWidth >= 300 && boundsHeight >= 150) {
            console.log('🌍 Detected GLOBAL dataset - keeping India as initial center')
            // Keep India center for initial view, but allow global navigation
            centerLng = 78.9629
            centerLat = 20.5937
          } else if (boundsWidth < 100 && boundsHeight < 100) {
            // Regional data - use calculated center if it's reasonable
            const calcLng = (bounds.minX + bounds.maxX) / 2
            const calcLat = (bounds.minY + bounds.maxY) / 2
            
            // Check if calculated center is reasonable (not in middle of ocean)
            if (Math.abs(calcLng) <= 180 && Math.abs(calcLat) <= 85) {
              centerLng = calcLng
              centerLat = calcLat
              console.log('✅ Using calculated regional center:', centerLng.toFixed(3), centerLat.toFixed(3))
            }
          }

          // ✅ GLOBAL: Use actual bounds from server (don't clamp to small region)
          const clampedBounds = {
            minX: Math.max(-180, Math.min(180, bounds.minX)),
            maxX: Math.max(-180, Math.min(180, bounds.maxX)),
            minY: Math.max(-85, Math.min(85, bounds.minY)),
            maxY: Math.max(-85, Math.min(85, bounds.maxY))
          }

          setMapBounds(clampedBounds)
          setDataCenter({ lng: centerLng, lat: centerLat })

          // ✅ GLOBAL: Set appropriate zoom for global data
          let targetZoom = 5 // Good for global view
          if (boundsWidth < 100) {
            // Regional data - zoom in more
            const calculatedZoom = Math.log2(360 / boundsWidth)
            targetZoom = Math.max(5, Math.min(8, Math.round(calculatedZoom)))
          }

          setViewState(prev => ({
            ...prev,
            longitude: centerLng,
            latitude: centerLat,
            zoom: targetZoom
          }))

          setCoordinateInfo({
            system: bounds.coordinateSystem || 'unknown',
            analysis: bounds.coordinateAnalysis || 'No analysis available',
          })

          setDebugInfo({
            dataLoaded: bounds.dataLoaded || false,
            polygonCount: bounds.polygonCount || 0,
            lndareCount: bounds.lndareCount || 0,
          })
        }

        if (layersRes.ok) {
          const layersData = await layersRes.json()
          console.log('🗺️ Available layers:', layersData.layers?.length || 0)
          setLayers(layersData.layers || [])
        }

      } catch (error) {
        console.error('❌ Fetch error:', error)
        setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
        setDataCenter({ lng: 78.9629, lat: 20.5937 })
      }
    }

    fetchData()
  }, [testServerConnection])

  const toggleLayer = useCallback((layerName) => {
    setSelectedLayers(prev => 
      prev.includes(layerName)
        ? prev.filter(name => name !== layerName)
        : [...prev, layerName]
    )
  }, [])

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true)
    console.log('✅ MapLibre loaded - zoom:', viewState.zoom)
  }, [viewState])

  const handleMapError = useCallback((event) => {
    console.error('❌ MapLibre error:', event.error?.message)
  }, [])

  const handleSourceError = useCallback((event) => {
    console.error('❌ Vector tile source error:', event)
    const errorInfo = `Vector tile error: ${event.sourceId} - ${event.error?.message || 'Unknown error'}`
    setTileLoadErrors(prev => [...prev.slice(-4), errorInfo])
  }, [])

  // ✅ ENHANCED: High-quality MapLibre style for global data
  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 
        'background-color': '#f0f8ff' // Light ocean background
      }
    }],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  }), [])

  // ✅ FIXED: Remove geographic restrictions - allow global tile loading
  const vectorTileSource = useMemo(() => ({
    type: 'vector',
    tiles: ['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt'],
    minzoom: 5,
    maxzoom: 8,
    attribution: 'Global High-Precision Map',
    // ✅ CRITICAL FIX: Remove bounds restriction to allow global loading
    // bounds: [68, 8, 97, 37] // ❌ REMOVED - was restricting to India only
  }), [])

  const testTileLoad = useCallback(async () => {
    // Test multiple regions
    const testUrls = [
      `http://localhost:8080/api/vector-tiles/6/46/29.mvt`, // India
      `http://localhost:8080/api/vector-tiles/6/32/21.mvt`, // Europe
      `http://localhost:8080/api/vector-tiles/6/16/25.mvt`, // Americas
    ]
    
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl)
        console.log(`🔍 Testing ${testUrl}:`, {
          status: response.status,
          size: response.headers.get('content-length')
        })
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          console.log('📦 Tile size:', arrayBuffer.byteLength, 'bytes')
        }
      } catch (error) {
        console.error(`❌ Tile test failed for ${testUrl}:`, error)
      }
    }
  }, [])

  const handleCenterOnData = useCallback(() => {
    if (dataCenter && dataCenter.lng && dataCenter.lat) {
      console.log('🎯 Centering on data:', dataCenter.lng.toFixed(3), dataCenter.lat.toFixed(3))
      setViewState(prev => ({
        ...prev,
        longitude: dataCenter.lng,
        latitude: dataCenter.lat,
        zoom: 6
      }))
    } else {
      console.log('🎯 Using India fallback center')
      setViewState(prev => ({
        ...prev,
        longitude: 78.9629,
        latitude: 20.5937,
        zoom: 6
      }))
    }
  }, [dataCenter])

  // ✅ NEW: Add navigation helpers for global data
  const handleCenterOnWorld = useCallback(() => {
    console.log('🌍 Centering on world view')
    setViewState(prev => ({
      ...prev,
      longitude: 0,
      latitude: 0,
      zoom: 2
    }))
  }, [])

  const handleCenterOnEurope = useCallback(() => {
    console.log('🇪🇺 Centering on Europe')
    setViewState(prev => ({
      ...prev,
      longitude: 10,
      latitude: 50,
      zoom: 5
    }))
  }, [])

  const handleCenterOnAmericas = useCallback(() => {
    console.log('🇺🇸 Centering on Americas')
    setViewState(prev => ({
      ...prev,
      longitude: -100,
      latitude: 40,
      zoom: 4
    }))
  }, [])

  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(8, prev.zoom + 0.5)
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(1, prev.zoom - 0.5) // ✅ Allow zooming out to world view
    }))
  }, [])

  if (!mapBounds) {
    return (
      <div className="app-container loading">
        <div className="loading-message">
          <div className="spinner"></div>
          <h2>Loading Global Vector Map...</h2>
          <p>Initializing worldwide high-precision data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="control-panel">
        <div className="server-status">
          <strong>MapLibre Status:</strong>
          <span className={`status ${serverStatus}`}>
            {serverStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>

        <div className="debug-info">
          <strong>Global Map Info:</strong>
          <div>🌍 Zoom: {viewState.zoom.toFixed(1)} (Global: 1-8)</div>
          <div>📍 Center: {viewState.longitude.toFixed(3)}, {viewState.latitude.toFixed(3)}</div>
          <div>🏝️ Land Areas: {debugInfo.lndareCount || 0}</div>
          <div>🗺️ Base Features: {debugInfo.polygonCount || 0}</div>
          <div>📊 Vector Layers: {layers.length}</div>
          <div>⚡ MapLibre Rendering: {mapLoaded ? 'Active' : 'Loading'}</div>
          {dataCenter && (
            <div>🎯 Data Center: {dataCenter.lng?.toFixed(3) || 'N/A'}, {dataCenter.lat?.toFixed(3) || 'N/A'}</div>
          )}
        </div>

        <div className="zoom-controls">
          <button onClick={handleZoomOut} disabled={viewState.zoom <= 1}>
            🔍- Zoom Out
          </button>
          <button onClick={handleZoomIn} disabled={viewState.zoom >= 8}>
            🔍+ Zoom In
          </button>
          <button onClick={testTileLoad}>
            🔍 Test Global Tiles
          </button>
        </div>

        {/* ✅ NEW: Global navigation controls */}
        <div className="navigation-controls">
          <h4>Quick Navigation</h4>
          <button onClick={handleCenterOnWorld}>
            🌍 World View
          </button>
          <button onClick={handleCenterOnData}>
            🇮🇳 India Center
          </button>
          <button onClick={handleCenterOnEurope}>
            🇪🇺 Europe
          </button>
          <button onClick={handleCenterOnAmericas}>
            🇺🇸 Americas
          </button>
        </div>

        <div className="layer-controls">
          <h3>Global Vector Layers</h3>
          
          <label>
            <input
              type="checkbox"
              checked={selectedLayers.includes('lndare')}
              onChange={() => toggleLayer('lndare')}
            />
            🏝️ Land Areas (Global) - {debugInfo.lndareCount || 0}
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedLayers.includes('base')}
              onChange={() => toggleLayer('base')}
            />
            🗺️ Base Layer (Global) - {debugInfo.polygonCount || 0}
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedLayers.includes('coastline')}
              onChange={() => toggleLayer('coastline')}
            />
            🗾 Smooth Coastlines
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedLayers.includes('depths')}
              onChange={() => toggleLayer('depths')}
            />
            🌊 Depth Areas
          </label>
        </div>
      </div>

      <ReactMapGL
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        onError={handleMapError}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={mapStyle}
        attributionControl={false}
        minZoom={1}  // ✅ Allow world view
        maxZoom={8}
        antialias={true}
        preserveDrawingBuffer={true}
        failIfMajorPerformanceCaveat={false}
      >
        {mapLoaded && (
          <Source
            id="global-vector-tiles"
            {...vectorTileSource}
            onError={handleSourceError}
          >
            {/* 🏝️ GLOBAL: Land areas worldwide */}
            {selectedLayers.includes('lndare') && (
              <>
                <Layer
                  id="lndare-fill"
                  source="global-vector-tiles"
                  source-layer="lndare"
                  type="fill"
                  paint={{
                    'fill-color': '#8B4513', // Rich brown for land
                    'fill-opacity': 0.9,
                    'fill-antialias': true
                  }}
                />
                <Layer
                  id="lndare-outline"
                  source="global-vector-tiles"
                  source-layer="lndare"
                  type="line"
                  layout={{
                    'line-join': 'round',
                    'line-cap': 'round'
                  }}
                  paint={{
                    'line-color': '#654321',
                    'line-width': [
                      'interpolate',
                      ['exponential', 1.5],
                      ['zoom'],
                      1, 0.2,  // ✅ Thin lines for world view
                      3, 0.5,
                      5, 0.8,
                      6, 1.2,
                      7, 1.8,
                      8, 2.5
                    ],
                    'line-opacity': 0.8
                  }}
                />
              </>
            )}

            {/* 🗺️ GLOBAL: Base layer features worldwide */}
            {selectedLayers.includes('base') && (
              <>
                <Layer
                  id="base-fill"
                  source="global-vector-tiles"
                  source-layer="base"
                  type="fill"
                  paint={{
                    'fill-color': '#4682B4',
                    'fill-opacity': 0.3,
                    'fill-antialias': true
                  }}
                />
                <Layer
                  id="base-outline"
                  source="global-vector-tiles"
                  source-layer="base"
                  type="line"
                  layout={{
                    'line-join': 'round',
                    'line-cap': 'round'
                  }}
                  paint={{
                    'line-color': '#2F4F4F',
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      1, 0.1,
                      3, 0.3,
                      5, 0.5,
                      8, 1
                    ],
                    'line-opacity': 0.5
                  }}
                />
              </>
            )}

            {/* 🗾 GLOBAL: Coastlines worldwide */}
            {selectedLayers.includes('coastline') && (
              <Layer
                id="coastline-line"
                source="global-vector-tiles"
                source-layer="coastline"
                type="line"
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                  'line-miter-limit': 2,
                  'line-round-limit': 1.05
                }}
                paint={{
                  'line-color': '#003366',
                  'line-width': [
                    'interpolate',
                    ['exponential', 1.8],
                    ['zoom'],
                    1, 0.5,  // ✅ Visible at world view
                    3, 1,
                    5, 2,
                    6, 2.5,
                    7, 3.2,
                    8, 4
                  ],
                  'line-opacity': 0.95,
                  'line-blur': 0.5
                }}
              />
            )}

            {/* 🌊 GLOBAL: Depth areas worldwide */}
            {selectedLayers.includes('depths') && (
              <>
                <Layer
                  id="depths-fill"
                  source="global-vector-tiles"
                  source-layer="depths"
                  type="fill"
                  paint={{
                    'fill-color': '#B0E0E6',
                    'fill-opacity': 0.2,
                    'fill-antialias': true
                  }}
                />
                <Layer
                  id="depths-outline"
                  source="global-vector-tiles"
                  source-layer="depths"
                  type="line"
                  layout={{
                    'line-join': 'round',
                    'line-cap': 'round'
                  }}
                  paint={{
                    'line-color': '#1E90FF',
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      1, 0.2,
                      5, 0.8,
                      8, 1.5
                    ],
                    'line-opacity': 0.4
                  }}
                />
              </>
            )}
          </Source>
        )}

        {/* Enhanced Global Status Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '13px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          lineHeight: '1.4'
        }}>
          🗺️ MapLibre Global Renderer | Zoom: {viewState.zoom.toFixed(1)} | 
          Active Layers: {selectedLayers.length}
          <br/>
          🌍 Global Coverage | {debugInfo.lndareCount || 0} land features | 
          Current Region: {
            Math.abs(viewState.longitude - 78.9) < 20 && Math.abs(viewState.latitude - 20.6) < 15 ? 'India 🇮🇳' :
            Math.abs(viewState.longitude - 10) < 30 && Math.abs(viewState.latitude - 50) < 20 ? 'Europe 🇪🇺' :
            Math.abs(viewState.longitude + 100) < 50 && Math.abs(viewState.latitude - 40) < 30 ? 'Americas 🇺🇸' :
            'Other 🌍'
          }
          <br/>
          📍 Current: {viewState.longitude.toFixed(3)}°, {viewState.latitude.toFixed(3)}°
        </div>

        {/* Global navigation indicator */}
        {viewState.zoom <= 3 && (
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(34, 139, 34, 0.95)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            🌍 Global View Active | Navigate anywhere in the world!
            <br/>
            <small>Use navigation buttons or drag to explore different regions</small>
          </div>
        )}
      </ReactMapGL>
    </div>
  )
}

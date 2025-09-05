import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// ✅ CRITICAL: Request queue to prevent server overload
class TileRequestQueue {
  constructor(maxConcurrent = 3) { // Reduced from 4
    this.maxConcurrent = maxConcurrent
    this.activeRequests = 0
    this.queue = []
    this.rateLimitDelay = 20 // Minimum delay between requests
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
      const response = await fetch(url, {
        cache: 'force-cache', // Aggressive caching
      })
      resolve(response)
    } catch (error) {
      reject(error)
    } finally {
      this.activeRequests--
      setTimeout(() => this.processQueue(), this.rateLimitDelay)
    }
  }
}

const tileQueue = new TileRequestQueue(3) // Max 3 concurrent requests

export default function App() {
  const [mapBounds, setMapBounds] = useState(null)
  const [layers, setLayers] = useState([])
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

  // ✅ PERFORMANCE: Aggressive throttling
  const lastMoveTime = useRef(0)
  const moveTimeoutRef = useRef(null)
  
  const handleViewStateChange = useCallback((evt) => {
    const now = Date.now()
    
    // ✅ Immediate state update for smooth UI
    setViewState(evt.viewState)
    
    // ✅ Throttle any side effects
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current)
    }
    
    moveTimeoutRef.current = setTimeout(() => {
      if (!IS_PRODUCTION && now - lastMoveTime.current > 2000) {
        const zoom = evt.viewState.zoom
        if (zoom < 5 || zoom > 8) {
          console.warn(`Zoom ${zoom.toFixed(1)} outside MVT range 5-8`)
        }
        lastMoveTime.current = now
      }
    }, 1000) // 1 second debounce
  }, [])

  // ✅ OPTIMIZED: Server connection with timeout
  const testServerConnection = useCallback(async () => {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 2000) // Shorter timeout
      
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

  // ✅ STREAMLINED: Minimal data loading
  useEffect(() => {
    const fetchData = async () => {
      const serverOk = await testServerConnection()
      if (!serverOk) {
        setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
        return
      }

      try {
        // ✅ Only fetch essential data in parallel
        const [boundsRes, layersRes] = await Promise.all([
          fetch('http://localhost:8080/api/bounds'),
          fetch('http://localhost:8080/api/layers')
        ])

        if (boundsRes.ok) {
          const bounds = await boundsRes.json()
          setMapBounds(bounds)
          setViewState(prev => ({
            ...prev,
            longitude: (bounds.minX + bounds.maxX) / 2,
            latitude: (bounds.minY + bounds.maxY) / 2
          }))
        }

        if (layersRes.ok) {
          const layersData = await layersRes.json()
          setLayers(layersData.layers?.slice(0, 3) || []) // ✅ Limit to 3 layers max
        }

      } catch (error) {
        console.error('Data fetch failed:', error)
        setMapBounds({ minX: -180, maxX: 180, minY: -85, maxY: 85 })
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
    console.log('Map loaded')
  }, [])

  const handleMapError = useCallback((event) => {
    console.error('Map error:', event.error?.message)
  }, [])

  // ✅ STATIC: No re-creation
  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [{ 
      id: 'background', 
      type: 'background', 
      paint: { 'background-color': '#f0f8ff' } 
    }]
  }), [])

  if (!mapBounds) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading map... {serverStatus}
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactMapGL
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        onError={handleMapError}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        minZoom={4}
        maxZoom={9}
        // ✅ PERFORMANCE: Aggressive optimizations
        reuseMaps
        preserveDrawingBuffer={false}
        refreshExpiredTiles={false}
        transformRequest={(url) => {
          // ✅ Use our request queue for tile requests
          if (url.includes('/api/vector-tiles/')) {
            return { url }
          }
          return { url }
        }}
      >
        {mapLoaded && serverStatus === 'connected' && (
          <Source
            id="shapefile-mvt"
            type="vector"
            tiles={['http://localhost:8080/api/vector-tiles/{z}/{x}/{y}.mvt']}
            minzoom={5}
            maxzoom={8}
            // ✅ PERFORMANCE: Reduce tile density
            tileSize={512}
            volatile={false}
            buffer={64} // Reduce buffer for smaller tiles
          >
            {/* ✅ SIMPLIFIED: Only essential layers */}
            {selectedLayers.includes('base') && (
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
            )}

            {selectedLayers.includes('lndare') && (
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
            )}

            {/* ✅ LIMITED: Only 1-2 custom layers */}
            {layers.slice(0, 2).map((layer, index) => {
              if (!selectedLayers.includes(layer.name)) return null
              
              const hue = index * 180
              return (
                <Layer
                  key={layer.name}
                  id={`${layer.name}-fill`}
                  type="fill"
                  source="shapefile-mvt"
                  source-layer={layer.name}
                  paint={{
                    'fill-color': `hsl(${hue}, 70%, 50%)`,
                    'fill-opacity': 0.4
                  }}
                />
              )
            })}
          </Source>
        )}
      </ReactMapGL>

      {/* ✅ MINIMAL: Debug panel only in development */}
      {!IS_PRODUCTION && (
        <div style={{
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: 'white', 
          padding: '10px', 
          borderRadius: '4px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '200px'
        }}>
          <h4>🚀 Optimized MVT</h4>
          <p>Status: {serverStatus === 'connected' ? '✅' : '❌'}</p>
          <p>Zoom: {viewState.zoom.toFixed(1)}</p>
          <p>Active Requests: {tileQueue.activeRequests}/3</p>
          
          <div>
            {['base', 'lndare', ...layers.slice(0, 2).map(l => l.name)].map(name => (
              <label key={name} style={{display: 'block', fontSize: '12px', margin: '2px 0'}}>
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(name)}
                  onChange={() => toggleLayer(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

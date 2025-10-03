import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import { useDispatch, useSelector } from 'react-redux'
import { setMapLoaded, setCursorCoordinates, setSatelliteLoading, setViewState } from '../store/mapSlice'
import { mapStyle, getBasemapLayers, getOverlayLayers, satelliteLayer, marineNavigationLayer } from '../config/layers'
import { basemapSources, vectorSource, satelliteSource, marineNavigationSource } from '../config/sources'
import { useGetShipsInBoundingBoxQuery } from '../store/shipsApi'

// Throttle utility function
const throttle = (func, delay) => {
  let timeoutId
  let lastExecTime = 0
  return function (...args) {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

// Custom hook to handle ship icon loading
function useShipIcon(map) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!map) return
    
    if (map.hasImage('ship-icon')) { 
      setReady(true)
      return 
    }

    console.log('🚢 Loading ship icon from /Ships.png...')

    // Load the PNG icon
    map.loadImage('/Ships.png', (err, img) => {
      if (err) {
        console.error('❌ Failed to load /Ships.png:', err)
        createFallbackIcon(map)
        return
      }
      
      map.addImage('ship-icon', img, { sdf: false })
      console.log('✅ Ship icon loaded successfully')
      setReady(true)
    })

    const onMissing = (e) => {
      if (e.id === 'ship-icon') {
        console.log('⚠️ Ship icon missing, reloading...')
        setReady(false)
      }
    }
    
    map.on('styleimagemissing', onMissing)
    return () => map.off('styleimagemissing', onMissing)
  }, [map])

  const createFallbackIcon = (map) => {
    console.log('🔧 Creating fallback ship icon...')
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    
    const centerX = 16
    const centerY = 16
    
    ctx.clearRect(0, 0, 32, 32)
    
    ctx.fillStyle = '#0ea5e9'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - 12)
    ctx.lineTo(centerX - 8, centerY + 8)
    ctx.lineTo(centerX, centerY + 4)
    ctx.lineTo(centerX + 8, centerY + 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(centerX, centerY - 6, 3, 0, 2 * Math.PI)
    ctx.fill()
    
    const imageData = ctx.getImageData(0, 0, 32, 32)
    map.addImage('ship-icon', imageData, { sdf: false })
    console.log('✅ Fallback ship icon created')
    setReady(true)
  }

  return ready
}

// Helper function to calculate map bounds with caching
const calculateBounds = (() => {
  let cache = {}
  
  return (viewState) => {
    const { longitude, latitude, zoom } = viewState
    
    // Create cache key with rounded values to improve cache hits
    const cacheKey = `${Math.round(longitude * 1000)}_${Math.round(latitude * 1000)}_${Math.round(zoom * 10)}`
    
    if (cache[cacheKey]) {
      return cache[cacheKey]
    }
    
    const metersPerPixel = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom)
    const degreesPerMeter = 1 / 111320.0
    const degreesPerPixel = metersPerPixel * degreesPerMeter
    
    const viewportWidth = window.innerWidth || 1200
    const viewportHeight = window.innerHeight || 800
    
    const latDelta = (viewportHeight / 2) * degreesPerPixel
    const lngDelta = (viewportWidth / 2) * degreesPerPixel
    
    const bounds = {
      minLat: Math.max(latitude - latDelta, -85),
      maxLat: Math.min(latitude + latDelta, 85),
      minLng: Math.max(longitude - lngDelta, -180),
      maxLng: Math.min(longitude + lngDelta, 180)
    }
    
    // Cache the result
    cache[cacheKey] = bounds
    
    // Clean cache if it gets too large
    if (Object.keys(cache).length > 100) {
      cache = {}
      cache[cacheKey] = bounds
    }
    
    return bounds
  }
})()

// Memoized ship processing function
const processShipsData = (ships) => {
  if (!ships || ships.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  return {
    type: 'FeatureCollection',
    features: ships.map((ship, index) => {
      let course = 0
      if (ship.true_heading && ship.true_heading !== 511 && ship.true_heading !== null) {
        course = ship.true_heading
      } else if (ship.course_over_ground && ship.course_over_ground !== null) {
        course = ship.course_over_ground
      }

      // Your ship icon points east by default, so we need to adjust for that
      // Since the icon points east (90°), we subtract 90° from the course
      let arrowAngle = course - 90
      
      // Normalize to 0-360
      arrowAngle = arrowAngle % 360
      if (arrowAngle < 0) arrowAngle += 360
      

      return {
        type: 'Feature',
        geometry: { 
          type: 'Point', 
          coordinates: [ship.longitude, ship.latitude] 
        },
        properties: {
          name: ship.track_name || ship.mmsi || `Ship-${index}`,
          uuid: ship.uuid,
          mmsi: ship.mmsi,
          heading: arrowAngle,
          index: index
        }
      }
    })
  }
}

export default function MapComponent() {
  const mapRef = useRef()
  const dispatch = useDispatch()
  const { viewState, selectedBasemap, basemapKey, layerVisibility, satelliteVisible } = useSelector(state => state.map)
  const themeMode = useSelector(state => state.theme.mode)
  
  // State for debounced bounds to reduce API calls
  const [debouncedBounds, setDebouncedBounds] = useState(null)
  const [debouncedZoom, setDebouncedZoom] = useState(1)
  
  // Calculate bounds for current viewport with throttling
  const bounds = useMemo(() => {
    if (!viewState?.longitude || !viewState?.latitude || !viewState?.zoom) {
      return {
        minLat: -85,
        maxLat: 85,
        minLng: -180,
        maxLng: 180
      }
    }
    return calculateBounds(viewState)
  }, [viewState?.longitude, viewState?.latitude, viewState?.zoom])

  // Debounce bounds updates to reduce API calls
  const debouncedUpdateBounds = useCallback(
    debounce((newBounds, newZoom) => {
      setDebouncedBounds(newBounds)
      setDebouncedZoom(Math.floor(newZoom))
    }, 500), // Wait 500ms after user stops moving
    []
  )

  // Update debounced bounds when bounds change
  useEffect(() => {
    if (bounds && viewState?.zoom) {
      debouncedUpdateBounds(bounds, viewState.zoom)
    }
  }, [bounds, viewState?.zoom, debouncedUpdateBounds])

  // Get ships data using debounced bounding box
  const { 
    data: shipsData, 
    isLoading, 
    error,
    isFetching
  } = useGetShipsInBoundingBoxQuery(
    {
      bounds: debouncedBounds,
      zoom: debouncedZoom,
      hours: 240000,
    },
    { 
      pollingInterval: 60000, // Increased to 60 seconds to reduce requests
      refetchOnMountOrArgChange: false,
      skip: !debouncedBounds || !debouncedZoom,
    }
  )

  const ships = shipsData?.ships || []
  const totalShips = shipsData?.total || 0
  const samplingStrategy = shipsData?.sampling_strategy || 'Unknown'

  const iconReady = useShipIcon(mapRef.current?.getMap?.())

  // Throttled mouse move handler to improve performance
  const handleMouseMove = useCallback(
    throttle((event) => {
      const { lngLat } = event
      dispatch(setCursorCoordinates({ longitude: lngLat.lng, latitude: lngLat.lat }))
    }, 100), // Throttle to 10fps
    [dispatch]
  )

  // Create GeoJSON with memoization
  const shipsGeoJson = useMemo(() => {
    if (error || isLoading) {
      return { type: 'FeatureCollection', features: [] }
    }

    console.log(`🚢 Processing ${ships.length} ships (${totalShips} total) at zoom ${debouncedZoom} - Strategy: ${samplingStrategy}`)
    return processShipsData(ships)
  }, [ships, isLoading, error, debouncedZoom, totalShips, samplingStrategy])

  // Memoize source configurations
  const currentBasemapSource = useMemo(() => basemapSources[selectedBasemap], [selectedBasemap])
  
  // Throttled view state change handler
  const handleViewStateChange = useCallback(
    throttle((evt) => {
      dispatch(setViewState(evt.viewState))
    }, 16), // ~60fps
    [dispatch]
  )

  // Move ships to top when needed
  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!map || !iconReady) return

    const moveShipsToTop = () => {
      const shipLayers = ['ships-symbol', 'ships-labels']
      
      shipLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          try {
            map.moveLayer(layerId)
            console.log(`✅ Moved ${layerId} to top`)
          } catch (e) {
            // Ignore if layer doesn't exist
          }
        }
      })
    }

    setTimeout(moveShipsToTop, 100)
  }, [basemapKey, iconReady])

  const handleMapLoad = useCallback(() => {
    console.log('🗺️ Map loaded successfully')
    dispatch(setMapLoaded(true))
    setTimeout(() => dispatch(setSatelliteLoading(false)), 3000)
  }, [dispatch])

  const handleSourceError = useCallback((event) => {
    console.warn('⚠️ Tile loading issue:', event)
  }, [])

  // Memoize layer configurations
  const basemapLayers = useMemo(() => 
    getBasemapLayers(selectedBasemap), [selectedBasemap]
  )

  const overlayLayers = useMemo(() => 
    getOverlayLayers(layerVisibility), [layerVisibility]
  )

  const satelliteLayerConfig = useMemo(() => 
    satelliteLayer(satelliteVisible), [satelliteVisible]
  )

  const marineNavLayerConfig = useMemo(() => 
    marineNavigationLayer(layerVisibility.marineNavigation), [layerVisibility.marineNavigation]
  )

  // Memoize ship styling configurations
  const shipIconLayout = useMemo(() => ({
    'icon-image': 'ship-icon',
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      2, 0.4,
      4, 0.6,
      8, 1.0,
      12, 1.4,
      16, 1.8
    ],
    'icon-rotate': ['get', 'heading'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  }), [])

  const shipIconPaint = useMemo(() => ({
    'icon-opacity': 0.9
  }), [])

  const shipLabelsLayout = useMemo(() => ({
    'text-field': ['get', 'name'],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 9,
      12, 11,
      16, 13
    ],
    'text-offset': [0, 2.5],
    'text-allow-overlap': false,
    'text-optional': true
  }), [])

  const shipLabelsPaint = useMemo(() => ({
    'text-color': themeMode === 'dark' ? '#ffffff' : '#1e293b',
    'text-halo-color': themeMode === 'dark' ? '#1e293b' : '#ffffff',
    'text-halo-width': 1.5
  }), [themeMode])

  const fallbackCirclesPaint = useMemo(() => ({
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      2, 3,
      4, 4,
      8, 6,
      12, 8,
      16, 10
    ],
    'circle-color': '#0ea5e9',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.8
  }), [])

  return (
    <>
      {/* Enhanced debug info */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: '20px',
        background: 'rgba(0,0,0,0.85)',
        color: 'white',
        padding: '10px 12px',
        borderRadius: '6px',
        zIndex: 1000,
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '250px'
      }}>
        <div>🚢 Ships: {shipsGeoJson.features.length.toLocaleString()}</div>
        <div>📊 Total: {totalShips.toLocaleString()}</div>
        <div>🔍 Zoom: {viewState.zoom?.toFixed(1)} (Query: {debouncedZoom})</div>
        <div>🎯 Icon: {iconReady ? '✅' : '⏳'}</div>
        <div>📈 Strategy: {samplingStrategy}</div>
        <div>🔄 Loading: {isFetching ? '⏳' : '✅'}</div>
        <div>🗺️ ENC: {selectedBasemap === 'enc' ? '✅' : '❌'}</div>
        {debouncedBounds && (
          <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.8 }}>
            Query Bounds: {debouncedBounds.minLat.toFixed(1)},{debouncedBounds.minLng.toFixed(1)} to {debouncedBounds.maxLat.toFixed(1)},{debouncedBounds.maxLng.toFixed(1)}
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          Loading ships data...
        </div>
      )}

      {isFetching && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(34, 197, 94, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          Updating...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '12px'
        }}>
          Error loading ships data
        </div>
      )}

      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        onLoad={handleMapLoad}
        onMouseMove={handleMouseMove}
        style={{ width: '100%', height: '100vh' }}
        mapStyle={mapStyle}
        minZoom={0}
        maxZoom={17}
        antialias={true}
        attributionControl={false}
        bearing={viewState.bearing}
        pitch={viewState.pitch}
        // Performance optimizations
        preserveDrawingBuffer={false}
        failIfMajorPerformanceCaveat={false}
      >
        {/* Base layers */}
        <Source key={`basemap-${selectedBasemap}-${basemapKey}`} id="active-basemap" {...currentBasemapSource} onError={handleSourceError}>
          {basemapLayers.map((layer, index) => (
            <Layer key={`${selectedBasemap}-layer-${index}`} {...layer} />
          ))}
        </Source>

        <Source key={`satellite-${basemapKey}`} id="satellite-tiles" {...satelliteSource} onError={handleSourceError}>
          <Layer {...satelliteLayerConfig} />
        </Source>

        <Source key={`overlays-${basemapKey}`} id="vector-tiles" {...vectorSource} onError={handleSourceError}>
          {overlayLayers.map((layer, index) => (
            <Layer key={`overlay-${index}`} {...layer} />
          ))}
        </Source>

        <Source key={`marine-nav-${basemapKey}`} id="marine-navigation-tiles" {...marineNavigationSource} onError={handleSourceError}>
          <Layer {...marineNavLayerConfig} />
        </Source>

        {/* SHIPS - Only render when icon is ready AND we have ship data */}
        {iconReady && shipsGeoJson.features.length > 0 && (
          <Source id="ships" type="geojson" data={shipsGeoJson}>
            <Layer
              id="ships-symbol"
              type="symbol"
              layout={shipIconLayout}
              paint={shipIconPaint}
            />
            
            <Layer
              id="ships-labels"
              type="symbol"
              filter={['>', ['zoom'], 8]}
              layout={shipLabelsLayout}
              paint={shipLabelsPaint}
            />
          </Source>
        )}

        {/* Fallback: Show blue dots if icon not ready but we have ships */}
        {!iconReady && shipsGeoJson.features.length > 0 && (
          <Source id="ships-fallback" type="geojson" data={shipsGeoJson}>
            <Layer
              id="ships-circles"
              type="circle"
              paint={fallbackCirclesPaint}
            />
          </Source>
        )}
      </ReactMapGL>
    </>
  )
}
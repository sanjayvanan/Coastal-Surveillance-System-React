import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import { useDispatch, useSelector } from 'react-redux'
import { setMapLoaded, setCursorCoordinates, setSatelliteLoading, setViewState } from '../store/mapSlice'
import { mapStyle, getBasemapLayers, getOverlayLayers, satelliteLayer, marineNavigationLayer } from '../config/layers'
import { basemapSources, vectorSource, satelliteSource, marineNavigationSource } from '../config/sources'
import ShipsLayer from './ShipsLayer'

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

export default function MapComponent() {
  const mapRef = useRef()
  const dispatch = useDispatch()
  const { viewState, selectedBasemap, basemapKey, layerVisibility, satelliteVisible } = useSelector(state => state.map)
  
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

  // Throttled mouse move handler to improve performance
  const handleMouseMove = useCallback(
    throttle((event) => {
      const { lngLat } = event
      dispatch(setCursorCoordinates({ longitude: lngLat.lng, latitude: lngLat.lat }))
    }, 100), // Throttle to 10fps
    [dispatch]
  )

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
    if (!map) return

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
  }, [basemapKey])

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
    // Defensively prevent ENC layers from being loaded as a basemap
    selectedBasemap === 'enc' ? [] : getBasemapLayers(selectedBasemap), 
    [selectedBasemap]
  )

  const encLayers = useMemo(() => getBasemapLayers('enc'), []);

  const overlayLayers = useMemo(() => 
    getOverlayLayers(layerVisibility), [layerVisibility]
  )

  const satelliteLayerConfig = useMemo(() => 
    satelliteLayer(satelliteVisible), [satelliteVisible]
  )

  const marineNavLayerConfig = useMemo(() => 
    marineNavigationLayer(layerVisibility.marineNavigation), [layerVisibility.marineNavigation]
  )

  return (
    <>
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

        {/* ENC tiles as an overlay layer */}
        <Source key={`enc-tiles-${basemapKey}`} id="enc-tiles" {...basemapSources['enc']} onError={handleSourceError}>
          {encLayers.map((layer, index) => (
            <Layer
              key={`enc-layer-${index}`}
              {...layer}
              layout={{ ...layer.layout, visibility: layerVisibility.encTiles ? 'visible' : 'none' }}
            />
          ))}
        </Source>

        <Source key={`overlays-${basemapKey}`} id="vector-tiles" {...vectorSource} onError={handleSourceError}>
          {overlayLayers.map((layer, index) => (
            <Layer key={`overlay-${index}`} {...layer} />
          ))}
        </Source>

        <Source key={`marine-nav-${basemapKey}`} id="marine-navigation-tiles" {...marineNavigationSource} onError={handleSourceError}>
          <Layer {...marineNavLayerConfig} />
        </Source>

        {/* Ships Layer Component */}
        <ShipsLayer 
          map={mapRef.current?.getMap?.()} 
          debouncedBounds={debouncedBounds}
          debouncedZoom={debouncedZoom}
        />
      </ReactMapGL>
    </>
  )
}
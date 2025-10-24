import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
import { useDispatch, useSelector } from 'react-redux'
import { setMapLoaded, setCursorCoordinates, setSatelliteLoading, setViewState } from '../store/mapSlice'
import { mapStyle, getBasemapLayers, getOverlayLayers, satelliteLayer, marineNavigationLayer } from '../config/layers'
import { basemapSources, vectorSource, satelliteSource, marineNavigationSource } from '../config/sources'
import ShipsLayer from './ShipsLayer'

// --- Utility: Throttle ---
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

// --- Utility: Debounce ---
const debounce = (func, delay) => {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

// --- Helper: Cached bounds calculator ---
const calculateBounds = (() => {
  let cache = {}
  return (viewState) => {
    const { longitude, latitude, zoom } = viewState
    const cacheKey = `${Math.round(longitude * 1000)}_${Math.round(latitude * 1000)}_${Math.round(zoom * 10)}`
    if (cache[cacheKey]) return cache[cacheKey]

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

    cache[cacheKey] = bounds
    if (Object.keys(cache).length > 100) cache = { [cacheKey]: bounds }
    return bounds
  }
})()

export default function MapComponent() {
  const mapRef = useRef()
  const dispatch = useDispatch()
  const { viewState, selectedBasemap, basemapKey, layerVisibility, satelliteVisible } = useSelector(state => state.map)
  const themeMode = useSelector(state => state.theme.mode)

  const [debouncedBounds, setDebouncedBounds] = useState(null)
  const [debouncedZoom, setDebouncedZoom] = useState(1)
  const [encSpritesLoaded, setEncSpritesLoaded] = useState(false)
  const [encLayers, setEncLayers] = useState([])

  const bounds = useMemo(() => {
    if (!viewState?.longitude || !viewState?.latitude || !viewState?.zoom) {
      return { minLat: -85, maxLat: 85, minLng: -180, maxLng: 180 }
    }
    return calculateBounds(viewState)
  }, [viewState?.longitude, viewState?.latitude, viewState?.zoom])

  const debouncedUpdateBounds = useCallback(
    debounce((newBounds, newZoom) => {
      setDebouncedBounds(newBounds)
      setDebouncedZoom(Math.floor(newZoom))
    }, 500),
    []
  )

  useEffect(() => {
    if (bounds && viewState?.zoom) debouncedUpdateBounds(bounds, viewState.zoom)
  }, [bounds, viewState?.zoom, debouncedUpdateBounds])

  const handleMouseMove = useCallback(
    throttle((event) => {
      const { lngLat } = event
      dispatch(setCursorCoordinates({ longitude: lngLat.lng, latitude: lngLat.lat }))
    }, 100),
    [dispatch]
  )

  const currentBasemapSource = useMemo(() => basemapSources[selectedBasemap], [selectedBasemap])

  const handleViewStateChange = useCallback(
    throttle((evt) => {
      dispatch(setViewState(evt.viewState))
    }, 16),
    [dispatch]
  )

  const handleMapLoad = useCallback(async () => {
    console.log('🗺️ Map loaded successfully')
    
    const map = mapRef.current?.getMap()
    if (map) {
      try {
        // Import and register S-52 symbols
        const { s52Loader } = await import('../utils/s52Loader')
        const count = await s52Loader.registerSymbols(map)
        console.log(`✅ S-52 symbols registered: ${count}`)
        setEncSpritesLoaded(true)
        
        // Import and load smart ENC layers from autoEncLayers
        const { getSmartEncLayers } = await import('../config/autoEncLayers')
        const autoLayers = await getSmartEncLayers()
        console.log(`✅ Loaded ${autoLayers.length} ENC layers from autoEncLayers`)
        
        // Filter out background layer for overlay mode
        const filteredLayers = autoLayers
          .filter(layer => layer.id !== 'enc-background')
          .map(layer => ({
            ...layer,
            source: 'enc-tiles' // Fix source reference to match Source id
          }))
        
        setEncLayers(filteredLayers)
        console.log(`✅ Set ${filteredLayers.length} ENC overlay layers (background removed)`)
        
      } catch (error) {
        console.error('❌ Failed to load ENC layers:', error)
      }
    }
    
    dispatch(setMapLoaded(true))
    setTimeout(() => dispatch(setSatelliteLoading(false)), 3000)
  }, [dispatch])

  const handleSourceError = useCallback((event) => {
    console.warn('⚠️ Tile loading issue:', event)
  }, [])

  const basemapLayers = useMemo(
    () => getBasemapLayers(selectedBasemap),
    [selectedBasemap]
  )

  const overlayLayers = useMemo(() => getOverlayLayers(layerVisibility), [layerVisibility])
  const satelliteLayerConfig = useMemo(() => satelliteLayer(satelliteVisible), [satelliteVisible])
  const marineNavLayerConfig = useMemo(
    () => marineNavigationLayer(layerVisibility.marineNavigation),
    [layerVisibility.marineNavigation]
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
        preserveDrawingBuffer={false}
        failIfMajorPerformanceCaveat={false}
      >
        {/* Base layers */}
        <Source 
          key={`basemap-${selectedBasemap}-${basemapKey}`} 
          id="active-basemap" 
          {...currentBasemapSource} 
          onError={handleSourceError}
        >
          {basemapLayers.map((layer, index) => (
            <Layer key={`${selectedBasemap}-layer-${index}`} {...layer} />
          ))}
        </Source>

        <Source 
          key={`satellite-${basemapKey}`} 
          id="satellite-tiles" 
          {...satelliteSource} 
          onError={handleSourceError}
        >
          <Layer {...satelliteLayerConfig} />
        </Source>

        {/* ENC tiles as an overlay layer - separate source */}
        {encLayers.length > 0 && (
          <Source 
            key={`enc-overlay-${basemapKey}`} 
            id="enc-tiles" 
            {...basemapSources['enc']} 
            onError={handleSourceError}
          >
            {encLayers.map((layer, index) => (
              <Layer
                key={`enc-layer-${index}`}
                {...layer}
                layout={{ 
                  ...layer.layout, 
                  visibility: layerVisibility.encTiles ? 'visible' : 'none' 
                }}
              />
            ))}
          </Source>
        )}

        <Source 
          key={`overlays-${basemapKey}`} 
          id="vector-tiles" 
          {...vectorSource} 
          onError={handleSourceError}
        >
          {overlayLayers.map((layer, index) => (
            <Layer key={`overlay-${index}`} {...layer} />
          ))}
        </Source>

        <Source 
          key={`marine-nav-${basemapKey}`} 
          id="marine-navigation-tiles" 
          {...marineNavigationSource} 
          onError={handleSourceError}
        >
          <Layer {...marineNavLayerConfig} />
        </Source>

        {/* Ships Layer Component */}
        <ShipsLayer 
          map={mapRef.current?.getMap?.()} 
          debouncedBounds={debouncedBounds}
          debouncedZoom={debouncedZoom}
          key={basemapKey}
        />
      </ReactMapGL>

      {/* ENC Sprites Status Indicator */}
      {!encSpritesLoaded && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '20px',
          background: 'rgba(255, 165, 0, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          ⏳ Loading ENC sprites...
        </div>
      )}

      {encSpritesLoaded && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '20px',
          background: 'rgba(34, 197, 94, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          zIndex: 1000,

          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          ✅ ENC sprites ready ({encLayers.length} layers)
        </div>
      )}
    </>
  )
}
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSelector } from 'react-redux'
import { useGetShipsInBoundingBoxQuery } from '../store/shipsApi'

// ============================================================================
// CONSTANTS
// ============================================================================

const TRIANGLE_ICON_NAME = 'ship-triangle-icon'
const SHIP_ICON_NAME = 'ship-icon'
const SHIP_IMAGE_PATH = '/Ships.png'

// Layer IDs for z-index management
const LAYER_IDS = {
  TRIANGLES: 'ships-triangles-layer',
  ICONS: 'ships-icons-layer',
  LABELS: 'ships-labels-layer'
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Transform ship data into GeoJSON format
 */
const processShipsData = (ships) => {
  if (!ships || ships.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  return {
    type: 'FeatureCollection',
    features: ships.map((ship, index) => {
      // Determine ship heading
      let course = 0
      if (ship.true_heading && ship.true_heading !== 511 && ship.true_heading !== null) {
        course = ship.true_heading
      } else if (ship.course_over_ground && ship.course_over_ground !== null) {
        course = ship.course_over_ground
      }

      // Adjust for icon orientation (icon points east at 90°)
      let arrowAngle = ((course ) % 360)
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

/**
 * Create triangle icon for low zoom levels
 */
const createTriangleIcon = (map) => {
  if (!map || map.hasImage(TRIANGLE_ICON_NAME)) return
  
  console.log('🔧 Creating triangle ship icon...')
  const canvas = document.createElement('canvas')
  canvas.width = 20
  canvas.height = 20
  const ctx = canvas.getContext('2d')
  
  const centerX = 10
  const centerY = 10
  
  ctx.clearRect(0, 0, 20, 20)
  ctx.fillStyle = '#227138ff' // Red arrow
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - 7)      // Top
  ctx.lineTo(centerX - 4, centerY + 7)  // Bottom left
  ctx.lineTo(centerX, centerY + 3)      // Notch
  ctx.lineTo(centerX + 4, centerY + 7)  // Bottom right
  ctx.closePath()
  ctx.fill()
  
  map.addImage(TRIANGLE_ICON_NAME, ctx.getImageData(0, 0, 20, 20), { sdf: false })
  console.log('✅ Triangle ship icon created')
}

/**
 * Load detailed ship icon from image file
 */
const loadShipIcon = (map, onSuccess, onError) => {
  if (!map || map.hasImage(SHIP_ICON_NAME)) {
    onSuccess?.()
    return
  }
  
  console.log(`🚢 Loading ship icon from ${SHIP_IMAGE_PATH}...`)
  
  map.loadImage(SHIP_IMAGE_PATH, (err, img) => {
    if (err) {
      console.error(`❌ Failed to load ${SHIP_IMAGE_PATH}:`, err)
      onError?.()
      return
    }
    
    if (!map.hasImage(SHIP_ICON_NAME)) {
      map.addImage(SHIP_ICON_NAME, img, { sdf: false })
      console.log('✅ Ship icon loaded successfully')
    }
    onSuccess?.()
  })
}

/**
 * Ensure ship layers are always on top
 * Moves layers above all other layers after basemap changes
 */
const ensureLayersOnTop = (map) => {
  if (!map || !map.getStyle()) return
  
  const style = map.getStyle()
  if (!style || !style.layers) return
  
  // Get all ship layer IDs
  const shipLayerIds = Object.values(LAYER_IDS)
  
  // Find existing ship layers
  const existingShipLayers = shipLayerIds.filter(id => {
    try {
      return map.getLayer(id) !== undefined
    } catch {
      return false
    }
  })
  
  if (existingShipLayers.length === 0) return
  
  // Get all layer IDs in current style
  const allLayerIds = style.layers.map(layer => layer.id)
  
  // Find the topmost non-ship layer
  let topmostBaseLayer = null
  for (let i = allLayerIds.length - 1; i >= 0; i--) {
    const layerId = allLayerIds[i]
    if (!shipLayerIds.includes(layerId)) {
      topmostBaseLayer = layerId
      break
    }
  }
  
  // Move each ship layer above the topmost base layer
  existingShipLayers.forEach(layerId => {
    try {
      if (topmostBaseLayer) {
        map.moveLayer(layerId, topmostBaseLayer)
        console.log(`🔝 Moved ${layerId} above ${topmostBaseLayer}`)
      } else {
        // If no base layer found, move to absolute top
        map.moveLayer(layerId)
        console.log(`🔝 Moved ${layerId} to top`)
      }
    } catch (err) {
      console.warn(`⚠️ Could not move layer ${layerId}:`, err)
    }
  })
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook to manage ship icon loading
 * Only runs once on mount - icons persist across basemap changes
 */
const useShipIcons = (map) => {
  const [triangleReady, setTriangleReady] = useState(false)
  const [iconReady, setIconReady] = useState(false)

  const initializeIcons = useCallback(() => {
    if (!map) return

    // Create triangle icon (always available)
    createTriangleIcon(map)
    setTriangleReady(true)
    
    // Load detailed ship icon
    loadShipIcon(
      map,
      () => setIconReady(true),
      () => {
        console.error('❌ Failed to load ship icon')
        setIconReady(false)
      }
    )
  }, [map])

  useEffect(() => {
    if (!map) return
    
    // Initialize icons only once
    initializeIcons()

    // Handle missing images (auto-recovery)
    const onMissing = (e) => {
      if (e.id === TRIANGLE_ICON_NAME || e.id === SHIP_ICON_NAME) {
        console.log(`⚠️ Icon missing: ${e.id}, reinitializing...`)
        setTimeout(() => initializeIcons(), 50)
      }
    }
    
    map.on('styleimagemissing', onMissing)
    return () => map.off('styleimagemissing', onMissing)
  }, [map, initializeIcons])

  return { triangleReady, iconReady }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ShipsLayer = ({ map, debouncedBounds, debouncedZoom }) => {
  const themeMode = useSelector(state => state.theme.mode)
  const basemapKey = useSelector(state => state.map.basemapKey)
  
  // Fetch ships data
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
      pollingInterval: 60000,
      refetchOnMountOrArgChange: false,
      skip: !debouncedBounds || !debouncedZoom,
    }
  )

  // Derived data
  const ships = shipsData?.ships || []
  const totalShips = shipsData?.total || 0
  const samplingStrategy = shipsData?.sampling_strategy || 'Unknown'

  // Load icons (only once)
  const { triangleReady, iconReady } = useShipIcons(map)

  // Process ship data into GeoJSON
  const shipsGeoJson = useMemo(() => {
    if (error || isLoading) {
      return { type: 'FeatureCollection', features: [] }
    }
    console.log(`🚢 Processing ${ships.length} ships (${totalShips} total) at zoom ${debouncedZoom} - Strategy: ${samplingStrategy}`)
    return processShipsData(ships)
  }, [ships, isLoading, error, debouncedZoom, totalShips, samplingStrategy])

  const hasShips = shipsGeoJson.features.length > 0
  const hasLayers = (triangleReady || iconReady) && hasShips

  // Reorder layers when basemap changes (watching basemapKey from Redux)
  useEffect(() => {
    if (!map || !hasLayers) return
    
    console.log('🔄 Basemap key changed, reordering ship layers...')
    
    // Retry mechanism to ensure layers exist before moving them
    let attempts = 0
    const maxAttempts = 10
    
    const tryReorder = () => {
      const shipLayerIds = Object.values(LAYER_IDS)
      const allLayersExist = shipLayerIds.every(id => {
        try {
          return map.getLayer(id) !== undefined
        } catch {
          return false
        }
      })
      
      if (allLayersExist) {
        ensureLayersOnTop(map)
        console.log('✅ Ship layers reordered successfully')
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(tryReorder, 100 * attempts)
      }
    }
    
    // Wait a bit for basemap layers to be added, then reorder
    setTimeout(tryReorder, 300)
  }, [map, hasLayers, basemapKey])

  // ============================================================================
  // LAYER STYLES
  // ============================================================================

  const triangleLayout = useMemo(() => ({
    'icon-image': TRIANGLE_ICON_NAME,
    'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 4, 0.7, 6, 0.9, 8, 1.1],
    'icon-rotate': ['get', 'heading'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  }), [])

  const shipIconLayout = useMemo(() => ({
    'icon-image': SHIP_ICON_NAME,
    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 1.0, 12, 1.4, 16, 1.8],
    'icon-rotate': ['get', 'heading'],
    'icon-rotation-alignment': 'map',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  }), [])

  const labelsLayout = useMemo(() => ({
    'text-field': ['get', 'name'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 12, 11, 16, 13],
    'text-offset': [0, 2.5],
    'text-allow-overlap': false,
    'text-optional': true
  }), [])

  const labelsPaint = useMemo(() => ({
    'text-color': themeMode === 'dark' ? '#ffffff' : '#1e293b',
    'text-halo-color': themeMode === 'dark' ? '#1e293b' : '#ffffff',
    'text-halo-width': 1.5
  }), [themeMode])

  const iconPaint = useMemo(() => ({
    'icon-opacity': 0.9
  }), [])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Debug Panel */}
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
        <div>🚢 Ships: {ships.length.toLocaleString()}</div>
        <div>📊 Total: {totalShips.toLocaleString()}</div>
        <div>🔍 Zoom: {debouncedZoom}</div>
        <div>🎯 Triangle: {triangleReady ? '✅' : '⏳'}</div>
        <div>🎯 Ship Icon: {iconReady ? '✅' : '⏳'}</div>
        <div>📈 Strategy: {samplingStrategy}</div>
        <div>🔄 Loading: {isFetching ? '⏳' : '✅'}</div>
        {debouncedBounds && (
          <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.8 }}>
            Bounds: [{debouncedBounds.minLat.toFixed(1)}, {debouncedBounds.minLng.toFixed(1)}] to [{debouncedBounds.maxLat.toFixed(1)}, {debouncedBounds.maxLng.toFixed(1)}]
          </div>
        )}
      </div>

      {/* Loading Indicator */}
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

      {/* Fetching Indicator */}
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

      {/* Error Indicator */}
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
          Error loading ships
        </div>
      )}

      {/* Triangle Ships (Zoom ≤ 8) */}
      {triangleReady && hasShips && (
        <Source id="ships-triangles" type="geojson" data={shipsGeoJson}>
          <Layer
            id={LAYER_IDS.TRIANGLES}
            type="symbol"
            filter={['<=', ['zoom'], 6]}
            layout={triangleLayout}
            paint={iconPaint}
          />
        </Source>
      )}

      {/* Detailed Ship Icons (Zoom > 8) */}
      {iconReady && hasShips && (
        <Source id="ships-detailed" type="geojson" data={shipsGeoJson}>
          <Layer
            id={LAYER_IDS.ICONS}
            type="symbol"
            filter={['>', ['zoom'], 6]}
            layout={shipIconLayout}
            paint={iconPaint}
          />
          
          <Layer
            id={LAYER_IDS.LABELS}
            type="symbol"
            filter={['>', ['zoom'], 8]}
            layout={labelsLayout}
            paint={labelsPaint}
          />
        </Source>
      )}
    </>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ShipsLayer
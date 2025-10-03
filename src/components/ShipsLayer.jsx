import React, { useEffect, useState, useMemo } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { useSelector } from 'react-redux'
import { useGetShipsInBoundingBoxQuery } from '../store/shipsApi'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

      // Adjust for icon pointing direction (icon points east at 90°)
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

const createFallbackIcon = (map, setReady) => {
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

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useShipIcon = (map) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!map) return
    
    if (map.hasImage('ship-icon')) { 
      setReady(true)
      return 
    }

    console.log('🚢 Loading ship icon from /Ships.png...')

    map.loadImage('/Ships.png', (err, img) => {
      if (err) {
        console.error('❌ Failed to load /Ships.png:', err)
        createFallbackIcon(map, setReady)
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

  return ready
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ShipsLayer = ({ map, debouncedBounds, debouncedZoom }) => {
  // Redux state
  const themeMode = useSelector(state => state.theme.mode)
  
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

  // Custom hooks
  const iconReady = useShipIcon(map)

  // Memoized computations
  const shipsGeoJson = useMemo(() => {
    if (error || isLoading) {
      return { type: 'FeatureCollection', features: [] }
    }

    console.log(`🚢 Processing ${ships.length} ships (${totalShips} total) at zoom ${debouncedZoom} - Strategy: ${samplingStrategy}`)
    return processShipsData(ships)
  }, [ships, isLoading, error, debouncedZoom, totalShips, samplingStrategy])

  // Memoized styling configurations
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Debug info */}
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
        <div>🔍 Zoom: {debouncedZoom}</div>
        <div>🎯 Icon: {iconReady ? '✅' : '⏳'}</div>
        <div>📈 Strategy: {samplingStrategy}</div>
        <div>🔄 Loading: {isFetching ? '⏳' : '✅'}</div>
        {debouncedBounds && (
          <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.8 }}>
            Query Bounds: {debouncedBounds.minLat.toFixed(1)},{debouncedBounds.minLng.toFixed(1)} to {debouncedBounds.maxLat.toFixed(1)},{debouncedBounds.maxLng.toFixed(1)}
          </div>
        )}
      </div>

      {/* Loading state */}
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

      {/* Fetching state */}
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

      {/* Error state */}
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

      {/* Ship icons and labels */}
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

      {/* Fallback circles */}
      {!iconReady && shipsGeoJson.features.length > 0 && (
        <Source id="ships-fallback" type="geojson" data={shipsGeoJson}>
          <Layer
            id="ships-circles"
            type="circle"
            paint={fallbackCirclesPaint}
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
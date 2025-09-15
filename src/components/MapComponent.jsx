  import React, { useCallback, useMemo, useRef, useEffect } from 'react'
  import { Map as ReactMapGL, Source, Layer } from 'react-map-gl/maplibre'
  import { useDispatch, useSelector } from 'react-redux'
  import { setMapLoaded, setCursorCoordinates, setSatelliteLoading, setViewState } from '../store/mapSlice'
  import { mapStyle, getBasemapLayers, getOverlayLayers, satelliteLayer, marineNavigationLayer } from '../config/layers'
  import { basemapSources, vectorSource, satelliteSource, marineNavigationSource } from '../config/sources'
  import { useGetShipsTrackListQuery } from '../store/shipsApi'
  import { useMemo as useReactMemo } from 'react'

  export default function MapComponent() {
    const mapRef = useRef()
    const dispatch = useDispatch()
    const { viewState, selectedBasemap, basemapKey, layerVisibility, satelliteVisible } = useSelector(state => state.map)
    const themeMode = useSelector(state => state.theme.mode)
    const { data: ships = [], isLoading, error } = useGetShipsTrackListQuery(90000000, { 
      pollingInterval: 10000, // Reduced polling to 10 seconds
      refetchOnMountOrArgChange: true,
      skip: false
    })

    const handleMouseMove = useCallback((event) => {
      const { lngLat } = event;
      dispatch(setCursorCoordinates({ longitude: lngLat.lng, latitude: lngLat.lat }));
    }, [dispatch]);

    const shipsGeoJson = useMemo(() => {
      if (error) {
        console.warn('Ships API error:', error)
        return {
          type: 'FeatureCollection',
          features: []
        }
      }

      if (isLoading) {
        console.log('Loading ships data...')
        return {
          type: 'FeatureCollection',
          features: []
        }
      }

      if (!ships || ships.length === 0) {
        console.log('No ships data available')
        return {
          type: 'FeatureCollection',
          features: []
        }
      }

      console.log(`Processing ${ships.length} ships for map rendering`)

      // Create GeoJSON with all ships - filtering will be done in layer expressions
      return {
        type: 'FeatureCollection',
        features: ships.map((s, index) => ({
          type: 'Feature',
          geometry: { 
            type: 'Point', 
            coordinates: [s.longitude, s.latitude] 
          },
          properties: { 
            name: s.track_name || s.mmsi || `Ship-${index}`, 
            uuid: s.uuid,
            index: index,
            mmsi: s.mmsi
          }
        }))
      }
    }, [ships, isLoading, error])

    const shipColor = themeMode === 'dark' ? '#22d3ee' : '#0ea5e9'

    const currentBasemapSource = useMemo(() => basemapSources[selectedBasemap], [selectedBasemap])

    const handleViewStateChange = useCallback((evt) => {
      dispatch(setViewState(evt.viewState))
    }, [dispatch])

    const handleMapLoad = useCallback(() => {
      dispatch(setMapLoaded(true))
      setTimeout(() => dispatch(setSatelliteLoading(false)), 3000)
    }, [dispatch])

    const handleSourceError = useCallback((event) => {
      console.warn('⚠️ Tile loading issue:', event)
    }, [])

    // Ensure ships stay on top only when basemap actually changes
    useEffect(() => {
      const map = mapRef.current?.getMap?.()
      if (!map) return

      const ensureShipsOnTop = () => {
        // Wait for layers to be fully loaded
        setTimeout(() => {
          const shipLayers = ['ships-circle', 'ships-label'] // Only individual ship layers now
          
          shipLayers.forEach(layerId => {
            if (map.getLayer(layerId)) {
              try {
                map.moveLayer(layerId)
              } catch (e) {
                // Layer might not exist yet, ignore
              }
            }
          })
        }, 100)
      }

      // Only run when basemap actually changes (not on every style update)
      ensureShipsOnTop()
      
    }, [selectedBasemap, basemapKey]) // This only fires when basemap changes, not on theme/toggle changes

    return (
      <>
        {/* Loading and Error Indicators */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: 1000
          }}>
            Loading ships data...
          </div>
        )}
        
        {error && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: 1000
          }}>
            Error loading ships: {error.message}
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
        >
        {/* Basemap layers (bottom) */}
        <Source key={`basemap-${selectedBasemap}-${basemapKey}`} id="active-basemap" {...currentBasemapSource} onError={handleSourceError}>
          {getBasemapLayers(selectedBasemap).map((layer, index) => (
            <Layer key={`${selectedBasemap}-layer-${index}`} {...layer} />
          ))}
        </Source>

        {/* Satellite layer */}
        <Source key={`satellite-${basemapKey}`} id="satellite-tiles" {...satelliteSource} onError={handleSourceError}>
          <Layer {...satelliteLayer(satelliteVisible)} />
        </Source>

        {/* Vector overlay layers */}
        <Source key={`overlays-${basemapKey}`} id="vector-tiles" {...vectorSource} onError={handleSourceError}>
          {getOverlayLayers(layerVisibility).map((layer, index) => (
            <Layer key={`overlay-${index}`} {...layer} />
          ))}
        </Source>

        {/* Marine navigation layer */}
        <Source key={`marine-nav-${basemapKey}`} id="marine-navigation-tiles" {...marineNavigationSource} onError={handleSourceError}>
          <Layer {...marineNavigationLayer(layerVisibility.marineNavigation)} />
        </Source>

        {/* Ships layer (top) - MarineTraffic-style individual ships with intelligent filtering */}
        <Source id="ships" type="geojson" data={shipsGeoJson}>
          {/* Individual ship circles with MarineTraffic-style filtering */}
          <Layer 
            id="ships-circle" 
            type="circle" 
            filter={[
              'case',
              // ['<', ['zoom'], 6], ['==', ['%', ['get', 'index'], 50], 0], // Zoom < 6: Show every 50th ship
              ['<', ['zoom'], 4], ['==', ['%', ['get', 'index'], 25], 0], // Zoom < 8: Show every 25th ship  
              true // Zoom >= 8: Show all ships
            ]}
            paint={{ 
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 3,
                6, 4,
                10, 5,
                14, 6,
                17, 7
              ],
              'circle-color': shipColor, 
              'circle-stroke-width': 2,
              'circle-stroke-color': themeMode === 'dark' ? '#ffffff' : '#000000',
              'circle-opacity': 0.9
            }} 
          />
          
          {/* Ship labels - show at zoom 10+ with same filtering as circles */}
          <Layer 
            id="ships-label" 
            type="symbol" 
            filter={[
              'case',
              ['<', ['zoom'], 6], ['==', ['%', ['get', 'index'], 50], 0], // Zoom < 6: Show every 50th ship
              ['<', ['zoom'], 8], ['==', ['%', ['get', 'index'], 25], 0], // Zoom < 8: Show every 25th ship  
              true // Zoom >= 8: Show all ships
            ]}
            layout={{ 
              'text-field': ['get', 'name'], 
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 10,
                12, 11,
                14, 12,
                17, 13
              ],
              'text-offset': [0, 2],
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'text-optional': true
            }} 
            paint={{ 
              'text-color': themeMode === 'dark' ? '#ffffff' : '#000000', 
              'text-halo-color': themeMode === 'dark' ? '#000000' : '#ffffff', 
              'text-halo-width': 2,
              'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9, 0,
                10, 1
              ]
            }} 
          />
        </Source>
        </ReactMapGL>
      </>
    )
  }
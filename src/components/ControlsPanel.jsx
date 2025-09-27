import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { basemapOptions, quickLocations } from '../config/constants'
import { toggleTheme } from '../store/themeSlice'


import {
  setSelectedBasemap,
  toggleLayer,
  setSatelliteVisible,
  toggleSection,
  setViewState,
} from '../store/mapSlice'


const sidebarButtons = [
  { id: 'mapType', icon: '🗺️', label: 'Map Type' },
  { id: 'overlays', icon: '📊', label: 'Overlays' },
  { id: 'satellite', icon: '🛰️', label: 'MBTiles Overlay' },
  { id: 'quickNav', icon: '📍', label: 'Quick Navigation' },
  { id: 'theme', icon: '🌓', label: 'Toggle Theme' },
  { id: 'reset', icon: '🇱🇰', label: 'Reset to Sri Lanka' },
]

export default function SidebarControlsPanel() {
  const dispatch = useDispatch()
  const theme = useSelector((state) => state.theme.mode)
  const {
    selectedBasemap,
    layerVisibility,
    satelliteVisible,
    satelliteLoading,
    collapsedSections,
    viewState,
  } = useSelector((state) => state.map)

  // For satellite availability based on zoom
  const satelliteAvailable = viewState.zoom >= 9

  // Sidebar active panel state
  const [activePanel, setActivePanel] = useState(null)
  // Position for layer control panel (vertical aligned to button)
  const [buttonPosition, setButtonPosition] = useState({ top: 0 })

  // Reset to Sri Lanka
  const resetToSriLanka = () => {
    dispatch(setViewState({ longitude: 80.7718, latitude: 7.8731, zoom: 7, pitch: 0, bearing: 0 }))
  }

  // Navigate to quick location
  const navigateTo = (location) => {
    dispatch(setViewState({ ...viewState, longitude: location.lng, latitude: location.lat, zoom: location.zoom }))
  }

  // Handle sidebar button clicks
  const handleSidebarClick = (id, e) => {
    if (id === 'theme') {
      dispatch(toggleTheme())
      return
    }
    if (id === 'reset') {
      resetToSriLanka()
      return
    }
    // For togglable panels: mapType, overlays, satellite, quickNav
    if (activePanel === id) {
      setActivePanel(null)
    } else {
      // Position panel by button top
      const btnRect = e.currentTarget.getBoundingClientRect()
      setButtonPosition({ top: btnRect.top })
      setActivePanel(id)
    }
  }

  // Panel: base map selection
  const baseMapPanel = (
    <div className={`layer-control-panel ${theme}`} style={{ top: buttonPosition.top }}>
      <h4>Base Maps</h4>
      {basemapOptions.map((option) => (
        <label key={option.id} className="layer-option">
          <input
            type="radio"
            name="baseLayer"
            checked={selectedBasemap === option.id}
            onChange={() => dispatch(setSelectedBasemap(option.id))}
          />
          <span>
            <strong>{option.name}</strong> - {option.description}
          </span>
        </label>
      ))}
    </div>
  )

  // Panel: overlays toggles
  const overlaysPanel = (
    <div className={`layer-control-panel ${theme}`} style={{ top: buttonPosition.top, maxHeight: 320, overflowY: 'auto' }}>
      <h4>Overlays</h4>
      <label className="layer-option">
        <input
          type="checkbox"
          checked={layerVisibility.marineNavigation}
          onChange={() => dispatch(toggleLayer('marineNavigation'))}
        />
        <span>⚓ Marine Navigation - Buoys, beacons, and nautical marks</span>
      </label>
      <hr />
      <label className="layer-option">
        <input
          type="checkbox"
          checked={layerVisibility.lndare}
          onChange={() => dispatch(toggleLayer('lndare'))}
        />
        <span>🏞️ Land Areas</span>
      </label>
      <label className="layer-option">
        <input
          type="checkbox"
          checked={layerVisibility.lndarePolygon}
          onChange={() => dispatch(toggleLayer('lndarePolygon'))}
        />
        <span>🗾 Land Polygons</span>
      </label>
      <label className="layer-option">
        <input
          type="checkbox"
          checked={layerVisibility.depare}
          onChange={() => dispatch(toggleLayer('depare'))}
        />
        <span>🌊 Depth Areas</span>
      </label>
    </div>
  )

  // Panel: satellite toggle
  const satellitePanel = (
    <div className={`layer-control-panel ${theme}`} style={{ top: buttonPosition.top }}>
      <h4>MBTiles Overlay</h4>
      <button
        onClick={() => dispatch(setSatelliteVisible(!satelliteVisible))}
        disabled={satelliteLoading}
        className={`satellite-toggle ${satelliteVisible ? 'active' : ''}`}
      >
        {satelliteVisible ? 'ON' : 'OFF'}
      </button>
      <div className="help-text">{!satelliteAvailable ? '⚠️ Available at zoom ≥9' : '✅ Satellite ready'}</div>
    </div>
  )

  // Panel: quick navigation buttons
  const quickNavPanel = (
    <div className={`layer-control-panel ${theme}`} style={{ top: buttonPosition.top }}>
      <h4>Quick Navigation</h4>
      <div className="nav-buttons">
        {quickLocations.map((loc, idx) => (
          <button key={idx} onClick={() => navigateTo(loc)} className="nav-button">
            {loc.name}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className={`sidebar-controls-panel ${theme}`}>
        {sidebarButtons.map((btn) => (
          <button
            key={btn.id}
            className={`sidebar-button ${theme} ${activePanel === btn.id ? 'active' : ''}`}
            onClick={(e) => handleSidebarClick(btn.id, e)}
            title={btn.label}
          >
            <span className="button-icon">{btn.icon}</span>
          </button>
        ))}
      </div>
      {activePanel === 'mapType' && baseMapPanel}
      {activePanel === 'overlays' && overlaysPanel}
      {activePanel === 'satellite' && satellitePanel}
      {activePanel === 'quickNav' && quickNavPanel}
    </>
  )
}

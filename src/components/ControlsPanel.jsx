import React, { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { basemapOptions, quickLocations } from '../config/constants'
import { toggleTheme } from '../store/themeSlice'
import { setSelectedBasemap, toggleLayer, setSatelliteVisible, toggleSection, setViewState } from '../store/mapSlice'

export default function ControlsPanel() {
  const dispatch = useDispatch()
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const { selectedBasemap, layerVisibility, satelliteVisible, satelliteLoading, collapsedSections, viewState } = useSelector(state => state.map)
  const satelliteAvailable = viewState.zoom >= 9

  const navigateTo = (location) => {
    dispatch(setViewState({ ...viewState, longitude: location.lng, latitude: location.lat, zoom: location.zoom }))
  }

  const resetToSriLanka = () => {
    dispatch(setViewState({ longitude: 80.7718, latitude: 7.8731, zoom: 7, pitch: 0, bearing: 0 }))
  }

  return (
    <div className="controls-panel">
      <div className="panel-header" onClick={() => setPanelCollapsed(!panelCollapsed)}>
        <span className="panel-title">⚙️ Map Controls</span>
        <span className={`collapse-icon ${panelCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>

      {!panelCollapsed && (
        <div className="panel-content">
          <div className="control-section">
            <button onClick={() => dispatch(toggleTheme())} className="reset-button">🌓 Toggle Theme</button>
          </div>
          <div className="control-section">
            <button onClick={resetToSriLanka} className="reset-button">🇱🇰 Reset to Sri Lanka</button>
          </div>

          <div className="control-section">
            <div className="section-header" onClick={() => dispatch(toggleSection('basemaps'))}>
              <span className="section-title">🗺️ Base Maps</span>
              <span className={`collapse-icon ${collapsedSections.basemaps ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!collapsedSections.basemaps && (
              <div className="section-content">
                <div className="basemap-selector">
                  {basemapOptions.map(option => (
                    <label key={option.id} className="basemap-option">
                      <input type="radio" name="basemap" value={option.id} checked={selectedBasemap === option.id} onChange={() => dispatch(setSelectedBasemap(option.id))} />
                      <div className="basemap-info">
                        <div className="basemap-name">{option.name}</div>
                        <div className="basemap-description">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="control-section">
            <div className="section-header" onClick={() => dispatch(toggleSection('overlays'))}>
              <span className="section-title">📊 Overlays</span>
              <span className={`collapse-icon ${collapsedSections.overlays ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!collapsedSections.overlays && (
              <div className="section-content">
                <div className="overlay-item marine-navigation">
                  <label className="overlay-checkbox">
                    <input type="checkbox" checked={layerVisibility.marineNavigation} onChange={() => dispatch(toggleLayer('marineNavigation'))} />
                    <div className="checkbox-custom"></div>
                    <span className="overlay-label">⚓ Marine Navigation</span>
                  </label>
                  <div className="overlay-description">Buoys, beacons, and nautical marks</div>
                </div>
                <div className="overlay-divider"></div>
                <div className="overlay-item">
                  <label className="overlay-checkbox">
                    <input type="checkbox" checked={layerVisibility.lndare} onChange={() => dispatch(toggleLayer('lndare'))} />
                    <div className="checkbox-custom"></div>
                    <span className="overlay-label">🏞️ Land Areas</span>
                  </label>
                </div>
                <div className="overlay-item">
                  <label className="overlay-checkbox">
                    <input type="checkbox" checked={layerVisibility.lndarePolygon} onChange={() => dispatch(toggleLayer('lndarePolygon'))} />
                    <div className="checkbox-custom"></div>
                    <span className="overlay-label">🗾 Land Polygons</span>
                  </label>
                </div>
                <div className="overlay-item">
                  <label className="overlay-checkbox">
                    <input type="checkbox" checked={layerVisibility.depare} onChange={() => dispatch(toggleLayer('depare'))} />
                    <div className="checkbox-custom"></div>
                    <span className="overlay-label">🌊 Depth Areas</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="control-section">
            <div className="section-header" onClick={() => dispatch(toggleSection('satellite'))}>
              <span className="section-title">🛰️ MBTiles Overlay</span>
              <span className={`collapse-icon ${collapsedSections.satellite ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!collapsedSections.satellite && (
              <div className="section-content">
                <button onClick={() => dispatch(setSatelliteVisible(!satelliteVisible))} disabled={satelliteLoading} className={`satellite-toggle ${satelliteVisible ? 'active' : ''}`}>
                  {satelliteVisible ? 'ON' : 'OFF'}
                </button>
                <div className="help-text">{!satelliteAvailable ? '⚠️ Available at zoom ≥9' : '✅ Satellite ready'}</div>
              </div>
            )}
          </div>

          <div className="control-section">
            <div className="section-header" onClick={() => dispatch(toggleSection('navigation'))}>
              <span className="section-title">📍 Quick Navigation</span>
              <span className={`collapse-icon ${collapsedSections.navigation ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!collapsedSections.navigation && (
              <div className="section-content">
                <div className="nav-buttons">
                  {quickLocations.map((loc, idx) => (
                    <button key={idx} onClick={() => navigateTo(loc)} className="nav-button">{loc.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="control-section">
            <div className="section-title">🔍 Zoom Controls</div>
            <div className="zoom-controls">
              <button onClick={() => dispatch(setViewState({ ...viewState, zoom: Math.min(17, viewState.zoom + 1) }))} className="zoom-button">➕ In</button>
              <button onClick={() => dispatch(setViewState({ ...viewState, zoom: Math.max(0, viewState.zoom - 1) }))} className="zoom-button">➖ Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
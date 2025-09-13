import React from 'react'
import { useSelector } from 'react-redux'
import { basemapOptions } from '../config/constants'

export default function StatusPanel() {
  const { viewState, mapLoaded, layerVisibility, selectedBasemap } = useSelector(state => state.map)
  const activeOverlayCount = Object.values(layerVisibility).filter(Boolean).length - 1
  const selectedBasemapName = basemapOptions.find(opt => opt.id === selectedBasemap)?.name || 'Unknown'

  return (
    <div className="status-panel">
      <div className="panel-header">🗺️ <strong>Professional Maritime Mapping System</strong></div>
      <div className="status-grid">
        <div>📍 <strong>Position:</strong> {viewState.longitude.toFixed(4)}°, {viewState.latitude.toFixed(4)}°</div>
        <div>🔍 <strong>Zoom:</strong> {viewState.zoom.toFixed(2)} / 17</div>
        <div>⚡ <strong>Status:</strong> {mapLoaded ? '✅ Active' : '⏳ Loading...'}</div>
        <div>🗺️ <strong>Basemap:</strong> {selectedBasemapName}</div>
        <div>📊 <strong>Overlays:</strong> {activeOverlayCount}/3 Active</div>
        <div>⚓ <strong>Marine Nav:</strong> {layerVisibility.marineNavigation ? '✅ Active' : '❌ Off'}</div>
      </div>
    </div>
  )
}



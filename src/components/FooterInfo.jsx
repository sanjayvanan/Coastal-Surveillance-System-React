import React from 'react'
import { useSelector } from 'react-redux'
import { basemapOptions } from '../config/constants'

export default function FooterInfo() {
  const { layerVisibility, satelliteVisible, viewState, selectedBasemap } = useSelector(state => state.map)
  const satelliteAvailable = viewState.zoom >= 9
  const activeOverlayCount = Object.values(layerVisibility).filter(Boolean).length - 1
  const selectedBasemapName = basemapOptions.find(opt => opt.id === selectedBasemap)?.name || 'Unknown'
  return (
    <div className="footer-info">
      🎯 Maritime Navigation System | {selectedBasemapName} | Overlays: {activeOverlayCount}/3 Active | {layerVisibility.marineNavigation ? '⚓ Marine Nav' : ''} | {satelliteVisible && satelliteAvailable ? ' 🛰️ Full Coverage' : ' 🗺️ Vector Charts'}
    </div>
  )
}



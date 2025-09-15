import React from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import StatusPanel from './components/StatusPanel'
import ControlsPanel from './components/ControlsPanel'
import MapComponent from './components/MapComponent'
import FooterInfo from './components/FooterInfo'
import BottomBar from './components/BottomBar'

export default function App() {
  return (
    <div className="mapping-app">
      <StatusPanel />
      <ControlsPanel />
      <MapComponent />
      <FooterInfo />
      <BottomBar />
    </div>
  )
}

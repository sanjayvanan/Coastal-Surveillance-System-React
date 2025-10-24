import React from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import './styles/ControlPanel.css'
import StatusPanel from './components/StatusPanel'
import ControlsPanel from './components/ControlsPanel'
import MapComponent from './components/MapComponent'
import FooterInfo from './components/FooterInfo'
import BottomBar from './components/BottomBar'
import ScaleDisplay from './components/ScaleDisplay'


export default function App() {
  return (
    <div className="mapping-app">
      <StatusPanel />
      <ControlsPanel />
      <ScaleDisplay />
      <MapComponent />
      <FooterInfo />
      <BottomBar />
    </div>
  )
}

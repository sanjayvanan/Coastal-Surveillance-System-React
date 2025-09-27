import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setViewState } from '../store/mapSlice'

export default function ZoomControls() {
  const dispatch = useDispatch()
  const { viewState } = useSelector((state) => state.map)
  const zoom = viewState.zoom

  const zoomIn = () => {
    if (zoom < 17) {
      dispatch(setViewState({ ...viewState, zoom: Math.min(17, zoom + 1) }))
    }
  }

  const zoomOut = () => {
    if (zoom > 0) {
      dispatch(setViewState({ ...viewState, zoom: Math.max(0, zoom - 1) }))
    }
  }

  return (
    <div className="zoom-control-wrapper">
      <button onClick={zoomIn} className="zoom-button" aria-label="Zoom In">
        +
      </button>
      <div className="zoom-level">{zoom.toFixed(2)}</div>
      <button onClick={zoomOut} className="zoom-button" aria-label="Zoom Out">
        −
      </button>
    </div>
  )
}

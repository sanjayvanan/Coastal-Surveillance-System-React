import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  mapLoaded: false,
  viewState: {
    longitude: 80.7718,
    latitude: 7.8731,
    zoom: 7,
    pitch: 0,
    bearing: 0
  },
  cursorCoordinates: {
     longitude: 0,
     latitude: 0
  },
  satelliteVisible: false,
  satelliteLoading: true,
  selectedBasemap: 'maritime',
  basemapKey: 0,
  layerVisibility: {
    lndare: true,
    depare: true,
    lndarePolygon: true,
    marineNavigation: true,
    encTiles: false // Add ENC tiles toggle
  },
  collapsedSections: {
    basemaps: false,
    overlays: false,
    navigation: true,
    satellite: false
  }
}

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setMapLoaded(state, action) {
      state.mapLoaded = action.payload
    },
    setViewState(state, action) {
      state.viewState = action.payload
    },
    setCursorCoordinates(state, action) {
      state.cursorCoordinates = action.payload
    },
    setSatelliteVisible(state, action) {
      state.satelliteVisible = action.payload
    },
    setSatelliteLoading(state, action) {
      state.satelliteLoading = action.payload
    },
    toggleLayer(state, action) {
      const key = action.payload
      state.layerVisibility[key] = !state.layerVisibility[key]
    },
    setSelectedBasemap(state, action) {
      state.selectedBasemap = action.payload
      state.basemapKey = state.basemapKey + 1
    },
    toggleSection(state, action) {
      const key = action.payload
      state.collapsedSections[key] = !state.collapsedSections[key]
    }
  }
})

export const {
  setMapLoaded,
  setViewState,
  setCursorCoordinates,
  setSatelliteVisible,
  setSatelliteLoading,
  toggleLayer,
  setSelectedBasemap,
  toggleSection
} = mapSlice.actions

export default mapSlice.reducer
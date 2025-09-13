import { configureStore } from '@reduxjs/toolkit'
import mapReducer from './mapSlice'
import { shipsApi } from './shipsApi'
import themeReducer from './themeSlice'

export const store = configureStore({
  reducer: {
    map: mapReducer,
    theme: themeReducer,
    [shipsApi.reducerPath]: shipsApi.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(shipsApi.middleware)
})

export default store



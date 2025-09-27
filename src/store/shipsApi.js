import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const shipsApi = createApi({
  reducerPath: 'shipsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:3000' }),
  endpoints: (builder) => ({
    getShipsTrackList: builder.query({
      query: (hours = 40) => `/api/ships/trackList?hours=${hours}`,
      transformResponse: (response) => Array.isArray(response) ? response : [],
    }),
    
    getShipsInBoundingBox: builder.query({
      query: ({ bounds, zoom, hours = 24, limit, offset = 0 }) => {
        const params = new URLSearchParams({
          minLat: bounds.minLat.toString(),
          maxLat: bounds.maxLat.toString(), 
          minLng: bounds.minLng.toString(),
          maxLng: bounds.maxLng.toString(),
          zoom: zoom.toString(),
          hours: hours.toString(),
          offset: offset.toString()
        })
        
        if (limit) {
          params.append('limit', limit.toString())
        }
        
        return `/api/ships/trackList/bbox?${params.toString()}`
      },
      transformResponse: (response) => {
        if (response?.tracks && Array.isArray(response.tracks)) {
          return {
            ships: response.tracks,
            total: response.total_tracks || 0,
            returned: response.returned_tracks || 0,
            zoom_level: response.zoom_level || 0,
            sampling_strategy: response.sampling_strategy || 'Unknown',
            has_more: response.has_more || false,
            pagination: response.pagination || {}
          }
        }
        return {
          ships: [],
          total: 0,
          returned: 0,
          zoom_level: 0,
          sampling_strategy: 'None',
          has_more: false,
          pagination: {}
        }
      },
      // Keep data fresh for 30 seconds, then refetch
      keepUnusedDataFor: 30,
    })
  })
})

export const { 
  useGetShipsTrackListQuery, 
  useGetShipsInBoundingBoxQuery 
} = shipsApi
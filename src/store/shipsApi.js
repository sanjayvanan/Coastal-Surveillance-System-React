import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const shipsApi = createApi({
  reducerPath: 'shipsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:3000' }),
  endpoints: (builder) => ({
    getShipsTrackList: builder.query({
      query: (hours = 40) => `/api/ships/trackList?hours=${hours}`,
      transformResponse: (response) => Array.isArray(response) ? response : [],
    })
  })
})

export const { useGetShipsTrackListQuery } = shipsApi



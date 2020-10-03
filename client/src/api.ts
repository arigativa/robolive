import Decode, { Decoder } from 'frctl/Json/Decode'

import http, { Request } from 'httpBuilder'
import TempUnits from 'entities/TempUnits'
import DayForecast, { dayForecastDecoder } from 'entities/DayForecast'
import { Coordinates } from 'geo'

const FORECAST_API_URL = process.env.REACT_APP_FORECAST_API_URL || ''
const FORECAST_API_APPID = process.env.REACT_APP_FORECAST_API_APPID || ''
const TIMEOUT = Number(process.env.REACT_APP_HTTP_TIMEOUT || 0)

/**
 * Represents forecast for city
 */
export type Forecast = {
  city: string
  days: Array<DayForecast>
}

const forecastDecoder: Decoder<Forecast> = Decode.shape({
  city: Decode.field('city').field('name').string,
  days: Decode.field('list').of(dayForecastDecoder)
})

/**
 * Retrieves five day forecast for specific city
 *
 * @param units temperature units
 * @param city
 */
export const getForecastForCity = (
  units: TempUnits,
  city: string
): Request<Forecast> => {
  return http
    .get(`${FORECAST_API_URL}/forecast`)
    .withTimeout(TIMEOUT)
    .withQueryParam('appid', FORECAST_API_APPID)
    .withQueryParam('q', city)
    .withQueryParam('units', units)
    .expectJson(forecastDecoder)
}

/**
 * Retrieves five day forecast for specific position
 *
 * @param units temperature units
 * @param city
 */
export const getForecastForCoordinates = (
  units: TempUnits,
  coordinates: Coordinates
): Request<Forecast> => {
  return http
    .get(`${FORECAST_API_URL}/forecast`)
    .withTimeout(TIMEOUT)
    .withQueryParam('appid', FORECAST_API_APPID)
    .withQueryParam('lat', coordinates.lat.toString())
    .withQueryParam('lon', coordinates.lon.toString())
    .withQueryParam('units', units)
    .expectJson(forecastDecoder)
}

import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import TempUnits from 'entities/TempUnits'
import { Error as HttpError } from 'httpBuilder'
import * as Forecast from './'

it('initByCity', () => {
  const [initialState] = Forecast.initByCity('cityname')

  expect(initialState).toEqual({
    origin: Forecast.ByCity('cityname'),
    units: TempUnits.Fahrenheit,
    unitsChanging: false,
    forecast: RemoteData.Loading
  })
})

it('initByCoordinates', () => {
  const coords = { lat: 13.123, lon: 91.321 }
  const [initialState] = Forecast.initByCoordinates(coords)

  expect(initialState).toEqual({
    origin: Forecast.ByCoordinates(coords),
    units: TempUnits.Fahrenheit,
    unitsChanging: false,
    forecast: RemoteData.Loading
  })
})

describe('update', () => {
  it('LoadForecast', () => {
    const [nextState] = Forecast.update(
      {
        type: 'LoadForecast'
      },
      {
        origin: Forecast.ByCity('cityname'),
        units: TempUnits.Celcius,
        unitsChanging: true,
        forecast: RemoteData.Failure(HttpError.Timeout)
      }
    )

    expect(nextState).toEqual({
      origin: Forecast.ByCity('cityname'),
      units: TempUnits.Celcius,
      unitsChanging: true,
      forecast: RemoteData.Loading
    })
  })

  describe('LoadForecastDone', () => {
    it('set Failure when request fails', () => {
      const [nextState] = Forecast.update(
        {
          type: 'LoadForecastDone',
          result: Either.Left(HttpError.NetworkError)
        },
        {
          origin: Forecast.ByCity('cityname'),
          units: TempUnits.Celcius,
          unitsChanging: true,
          forecast: RemoteData.Loading
        }
      )

      expect(nextState).toEqual({
        origin: Forecast.ByCity('cityname'),
        units: TempUnits.Celcius,
        unitsChanging: false,
        forecast: RemoteData.Failure(HttpError.NetworkError)
      })
    })

    it('set Succeed when request success', () => {
      const [nextState] = Forecast.update(
        {
          type: 'LoadForecastDone',
          result: Either.Right({
            city: 'London',
            days: []
          })
        },
        {
          origin: Forecast.ByCity('cityname'),
          units: TempUnits.Fahrenheit,
          unitsChanging: true,
          forecast: RemoteData.Loading
        }
      )

      expect(nextState).toEqual({
        origin: Forecast.ByCity('cityname'),

        units: TempUnits.Fahrenheit,
        unitsChanging: false,
        forecast: RemoteData.Succeed({
          city: 'London',
          days: []
        })
      })
    })
  })

  it('ChangeUnits', () => {
    const [nextState] = Forecast.update(
      {
        type: 'ChangeUnits',
        units: TempUnits.Fahrenheit
      },
      {
        origin: Forecast.ByCity('cityname'),
        units: TempUnits.Celcius,
        unitsChanging: false,
        forecast: RemoteData.Succeed({
          city: 'London',
          days: []
        })
      }
    )

    expect(nextState).toEqual({
      origin: Forecast.ByCity('cityname'),
      units: TempUnits.Fahrenheit,
      unitsChanging: true,
      forecast: RemoteData.Succeed({
        city: 'London',
        days: []
      })
    })
  })
})

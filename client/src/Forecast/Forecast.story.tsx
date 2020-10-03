import React from 'react'
import { action } from '@storybook/addon-actions'
import { boolean } from '@storybook/addon-knobs'
import dayjs, { Dayjs } from 'dayjs'
import RemoteData from 'frctl/RemoteData'

import { Error as HttpError } from 'httpBuilder'
import TempUnits from 'entities/TempUnits'
import DayForecast from 'entities/DayForecast'
import * as Forecast from './index'

export default {
  title: 'Forecast',
  component: Forecast.View
}

const initial: Forecast.State = Forecast.initByCity('Munich')[0]

const makeDayForecast = (datestring: string, temp: number): DayForecast => {
  const dayDate = dayjs(datestring)
  const segments = new Array(8).fill(dayDate).map((d: Dayjs, i) => ({
    datetime: d.set('hour', 3 * i),
    temp: temp - 4 + i
  }))

  return {
    getDate: () => dayDate,
    getAverageTemp: () => temp,
    getSegments: () => segments
  }
}

const knobSucceedState = (): Forecast.State => ({
  ...initial,
  unitsChanging: boolean('Units changing', false),
  units: TempUnits.Fahrenheit,
  forecast: RemoteData.Succeed({
    city: 'London',
    days: [
      makeDayForecast('09-02-1993', 23.04),
      makeDayForecast('09-03-1993', 20.82),
      makeDayForecast('09-04-1993', 24.74),
      makeDayForecast('09-05-1993', 26.14),
      makeDayForecast('09-06-1993', 17.65)
    ]
  })
})

export const Loading: React.FC = () => (
  <Forecast.View pageSize={3} state={initial} dispatch={action('dispatch')} />
)

export const Succeed: React.FC = () => (
  <Forecast.View
    pageSize={3}
    state={knobSucceedState()}
    dispatch={action('dispatch')}
  />
)

export const Failure: React.FC = () => (
  <Forecast.View
    pageSize={3}
    state={{
      ...initial,
      forecast: RemoteData.Failure(HttpError.Timeout)
    }}
    dispatch={action('dispatch')}
  />
)

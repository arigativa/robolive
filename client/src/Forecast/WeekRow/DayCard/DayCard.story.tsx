import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { boolean, date, number, optionsKnob } from '@storybook/addon-knobs'

import TempUnits from 'entities/TempUnits'
import DayForecast from 'entities/DayForecast'
import DayCard, { SkeletonDayCard } from './index'

export default {
  title: 'Forecast . WeekRow . DayCard',
  component: DayCard
}

const knobUnits = (label: string, initialUnit: TempUnits): TempUnits => {
  return optionsKnob(
    label,
    {
      Celcius: TempUnits.Celcius,
      Fahrenheit: TempUnits.Fahrenheit
    },
    initialUnit,
    {
      display: 'radio'
    }
  )
}

const knobDayjs = (label: string, initialDate: Date): Dayjs => {
  return dayjs(date(label, initialDate))
}

const knobDayForecast = (): DayForecast => {
  const date_ = knobDayjs('Date', new Date(2020, 7, 14))
  const temp = number('Temperature', 30)

  return {
    getDate: () => date_,
    getAverageTemp: () => temp,
    getSegments: () => []
  }
}

export const Initial: React.FC = () => (
  <DayCard
    active={boolean('Active', false)}
    unitsChanging={boolean('Units changing', false)}
    units={knobUnits('Units', TempUnits.Celcius)}
    forecast={knobDayForecast()}
  />
)

export const Skeleton: React.FC = () => <SkeletonDayCard />

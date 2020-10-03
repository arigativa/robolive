import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { date, number, optionsKnob } from '@storybook/addon-knobs'

import TempUnits from 'entities/TempUnits'
import { DayForecastSegment } from 'entities/DayForecast'
import Chart from './'
import SkeletonChart from './Skeleton'

export default {
  title: 'Forecast . Chart',
  component: Chart
}

const knobDayjs = (label: string, initialDate: string): Dayjs => {
  return dayjs(date(label, dayjs(initialDate, 'MM-DD-YYYY HH:mm').toDate()))
}

const knobTemp = (label: string, initialTemp: number): number => {
  return number(label, initialTemp, {
    range: true,
    min: -50,
    max: 50,
    step: 0.01
  })
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

const knobSegment = (
  labelPostfix: string,
  initialDate: string,
  initialTemp: number
): DayForecastSegment => ({
  datetime: knobDayjs(`Datetime ${labelPostfix}`, initialDate),
  temp: knobTemp(`Temp ${labelPostfix}`, initialTemp)
})

export const OnlyPositive: React.FC = () => (
  <Chart
    units={knobUnits('Units', TempUnits.Fahrenheit)}
    segments={[
      knobSegment('#1', '01-02-2020 00:00', 23),
      knobSegment('#2', '01-02-2020 03:00', 21.32),
      knobSegment('#3', '01-02-2020 06:00', 24.2),
      knobSegment('#4', '01-02-2020 09:00', 25.9),
      knobSegment('#5', '01-02-2020 12:00', 26.1),
      knobSegment('#6', '01-02-2020 15:00', 28.4),
      knobSegment('#7', '01-02-2020 18:00', 25.31),
      knobSegment('#8', '01-02-2020 21:00', 20.97)
    ]}
  />
)

export const OnlyNegative: React.FC = () => (
  <Chart
    units={knobUnits('Units', TempUnits.Fahrenheit)}
    segments={[
      knobSegment('#1', '01-02-2020 00:00', -23),
      knobSegment('#2', '01-02-2020 03:00', -21.32),
      knobSegment('#3', '01-02-2020 06:00', -24.2),
      knobSegment('#4', '01-02-2020 09:00', -25.9),
      knobSegment('#5', '01-02-2020 12:00', -26.1),
      knobSegment('#6', '01-02-2020 15:00', -28.4),
      knobSegment('#7', '01-02-2020 18:00', -25.31),
      knobSegment('#8', '01-02-2020 21:00', -20.97)
    ]}
  />
)

export const BothPositiveAndNegative: React.FC = () => (
  <Chart
    units={knobUnits('Units', TempUnits.Fahrenheit)}
    segments={[
      knobSegment('#1', '01-02-2020 00:00', -1.3),
      knobSegment('#2', '01-02-2020 03:00', -0.42),
      knobSegment('#3', '01-02-2020 06:00', 1.92),
      knobSegment('#4', '01-02-2020 09:00', 3.4),
      knobSegment('#5', '01-02-2020 12:00', 7.12),
      knobSegment('#6', '01-02-2020 15:00', 4.09),
      knobSegment('#7', '01-02-2020 18:00', 0),
      knobSegment('#8', '01-02-2020 21:00', -3.12)
    ]}
  />
)

export const Skeleton: React.FC = () => (
  <SkeletonChart count={number('Count', 8)} />
)

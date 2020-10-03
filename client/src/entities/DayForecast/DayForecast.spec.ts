import dayjs from 'dayjs'

import { __test_only_initDayForecast__ as initDayForecast } from './'

it('empty result from empty array', () => {
  expect(initDayForecast([])).toEqual([])
})

it('single segment for sinle day', () => {
  const segment1 = {
    datetime: dayjs('01-01-2020'),
    temp: 10
  }
  const segment2 = {
    datetime: dayjs('01-02-2020'),
    temp: 11
  }
  const segment3 = {
    datetime: dayjs('01-03-2020'),
    temp: 12
  }
  const days = initDayForecast([segment1, segment2, segment3])

  expect(days.map(day => day.getSegments())).toEqual([
    [segment1],
    [segment2],
    [segment3]
  ])

  expect(days.map(day => day.getAverageTemp())).toEqual([10, 11, 12])
  expect(days.map(day => day.getDate())).toEqual([
    dayjs('01-01-2020'),
    dayjs('01-02-2020'),
    dayjs('01-03-2020')
  ])
})

it('multipe segments', () => {
  const segment1 = {
    datetime: dayjs('01-01-2020'),
    temp: 10
  }
  const segment2 = {
    datetime: dayjs('01-01-2020'),
    temp: 11
  }
  const segment3 = {
    datetime: dayjs('01-02-2020'),
    temp: 12
  }
  const segment4 = {
    datetime: dayjs('01-02-2020'),
    temp: 13
  }
  const segment5 = {
    datetime: dayjs('01-02-2020'),
    temp: 14
  }
  const segment6 = {
    datetime: dayjs('01-02-2020'),
    temp: 15
  }
  const segment7 = {
    datetime: dayjs('01-03-2020'),
    temp: 16.12
  }
  const segment8 = {
    datetime: dayjs('01-03-2020'),
    temp: 17.34
  }
  const segment9 = {
    datetime: dayjs('01-03-2020'),
    temp: 18.71
  }
  const days = initDayForecast([
    segment1,
    segment2,
    segment3,
    segment4,
    segment5,
    segment6,
    segment7,
    segment8,
    segment9
  ])

  expect(days.map(day => day.getSegments())).toEqual([
    [segment1, segment2],
    [segment3, segment4, segment5, segment6],
    [segment7, segment8, segment9]
  ])

  expect(days.map(day => day.getAverageTemp())).toEqual([10.5, 13.5, 17.39])
  expect(days.map(day => day.getDate())).toEqual([
    dayjs('01-01-2020'),
    dayjs('01-02-2020'),
    dayjs('01-03-2020')
  ])
})

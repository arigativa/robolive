import dayjs, { Dayjs } from 'dayjs'
import Decode, { Decoder } from 'frctl/Json/Decode'

/**
 * Represents summary day forecast build from segments.
 */
type DayForecast = {
  /**
   * Returns date of forecast
   */
  getDate(): Dayjs

  /**
   * Returns temperature calculadted as average temp of segments
   */
  getAverageTemp(): number

  /**
   * Returns temp segments of a day
   */
  getSegments(): Array<DayForecastSegment>
}

export default DayForecast

/**
 * Represents 3 hours forecast segment
 */
export type DayForecastSegment = {
  datetime: Dayjs
  temp: number
}

const segmentDecoder: Decoder<DayForecastSegment> = Decode.shape({
  datetime: Decode.field('dt').int.map(ts => dayjs(1000 * ts)),
  temp: Decode.field('main').field('temp').float
})

class DayForecastImpl implements DayForecast {
  public constructor(private readonly segments: Array<DayForecastSegment>) {}

  public getDate(): Dayjs {
    if (this.segments.length === 0) {
      return dayjs('01-01-1970')
    }

    return this.segments[0].datetime
  }

  public getAverageTemp(): number {
    // don't divide by zero
    if (this.segments.length === 0) {
      return 0
    }

    let total = 0

    for (const segment of this.segments) {
      total += segment.temp
    }

    return total / this.segments.length
  }

  public getSegments(): Array<DayForecastSegment> {
    return this.segments
  }
}

export const __test_only_initDayForecast__ = (
  segments: Array<DayForecastSegment>
): Array<DayForecast> => {
  if (segments.length === 0) {
    return []
  }

  const acc: Array<DayForecast> = []
  let currentDaySegments = segments.slice(0, 1)

  for (let i = 1; i < segments.length; i++) {
    const daySegment = segments[i]

    if (segments[i - 1].datetime.isSame(daySegment.datetime, 'day')) {
      currentDaySegments.push(daySegment)
    } else {
      acc.push(new DayForecastImpl(currentDaySegments))
      currentDaySegments = [daySegment]
    }
  }

  if (currentDaySegments.length > 0) {
    acc.push(new DayForecastImpl(currentDaySegments))
  }

  return acc
}

export const dayForecastDecoder: Decoder<Array<DayForecast>> = Decode.list(
  segmentDecoder
).map(__test_only_initDayForecast__)

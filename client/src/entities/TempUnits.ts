import { round } from 'utils'

/**
 * Represents measure units of temperature
 */
enum TempUnits {
  Celcius = 'metric',
  Fahrenheit = 'imperial'
}

export default TempUnits

export const unitsToSymbol = (units: TempUnits): string => {
  switch (units) {
    case TempUnits.Celcius:
      return '°C'
    case TempUnits.Fahrenheit:
      return '°F'
  }
}

export const formatTempUnits = (temp: number, units: TempUnits): string => {
  if (temp > 0) {
    return `+${round(temp, 2)}${unitsToSymbol(units)}`
  }

  return `${round(temp, 2)}${unitsToSymbol(units)}`
}

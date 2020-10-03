import React from 'react'
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  YAxis,
  XAxis,
  ReferenceLine,
  Tooltip,
  TooltipProps
} from 'recharts'
import Box from '@material-ui/core/Box'
import colorsCyan from '@material-ui/core/colors/cyan'
import colorsGrey from '@material-ui/core/colors/grey'

import TempUnits, { formatTempUnits } from 'entities/TempUnits'
import { DayForecastSegment } from 'entities/DayForecast'

const convertSegmentToPoint = (
  segment: DayForecastSegment
): { x: string; y: number } => ({
  x: segment.datetime.format('HH:mm A'),
  y: segment.temp
})

const yDomain: [(dataMin: number) => number, (dataMax: number) => number] = [
  dataMin => Math.min(0, dataMin),
  dataMax => Math.max(0, dataMax)
]

const yPadding = { top: 8, bottom: 8 }

const cursorStyles: React.CSSProperties = {
  fill: colorsGrey[100]
}

const ViewTooltipContent: React.FC<
  TooltipProps & {
    units: TempUnits
  }
> = ({ units, ...props }) => {
  if (!props.active) {
    return null
  }

  return (
    <Box
      padding={2}
      boxShadow={2}
      bgcolor="white"
      borderRadius={2}
      fontSize={16}
    >
      {props.label}:{' '}
      {props.payload?.map(({ value }) =>
        typeof value === 'number' ? formatTempUnits(value, units) : value
      )}
    </Box>
  )
}

const Chart: React.FC<{
  units: TempUnits
  segments: Array<DayForecastSegment>
}> = React.memo(({ units, segments }) => {
  const data = React.useMemo(() => segments.map(convertSegmentToPoint), [
    segments
  ])

  const viewContent = React.useMemo(
    () => <ViewTooltipContent units={units} />,
    [units]
  )

  return (
    <ResponsiveContainer height={250}>
      <BarChart data={data}>
        <Tooltip cursor={cursorStyles} content={viewContent} />
        <ReferenceLine y={0} stroke={colorsGrey[300]} />
        <XAxis dataKey="x" axisLine={false} tickLine={false} />
        <YAxis hide domain={yDomain} padding={yPadding} />
        <Bar fill={colorsCyan[500]} dataKey="y" maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  )
})

export default Chart

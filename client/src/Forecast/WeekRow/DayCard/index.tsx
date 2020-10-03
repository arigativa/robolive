import React, { ReactNode } from 'react'
import Box from '@material-ui/core/Box'
import Card, { CardProps } from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardActions from '@material-ui/core/CardActions'
import Button from '@material-ui/core/Button'
import Skeleton from '@material-ui/lab/Skeleton'
import { useTheme } from '@material-ui/core/styles'
import useMediaQuery from '@material-ui/core/useMediaQuery'

import TempUnits, { formatTempUnits } from 'entities/TempUnits'
import DayForecast from 'entities/DayForecast'

const useResponsiveViewCard = (): {
  tempSize: string
  dateSize: string
} => {
  const theme = useTheme()
  const matchesSm = useMediaQuery(theme.breakpoints.up('sm'))
  const matchesMd = useMediaQuery(theme.breakpoints.up('md'))
  const matchesLg = useMediaQuery(theme.breakpoints.up('lg'))

  if (matchesLg) {
    return {
      tempSize: '1.8rem',
      dateSize: '1.2rem'
    }
  }

  if (matchesMd) {
    return {
      tempSize: '1.5rem',
      dateSize: '1rem'
    }
  }

  if (matchesSm) {
    return {
      tempSize: '1.2rem',
      dateSize: '0.9rem'
    }
  }

  return {
    tempSize: '0.9rem',
    dateSize: '0.6rem'
  }
}

const ViewCard: React.FC<
  CardProps & {
    tempNode: ReactNode
    dateNode: ReactNode
    actionNode: ReactNode
  }
> = ({ tempNode, dateNode, actionNode, ...props }) => {
  const { tempSize, dateSize } = useResponsiveViewCard()

  return (
    <Card {...props}>
      <CardContent>
        <Box fontWeight="400" fontSize={tempSize}>
          {tempNode}
        </Box>

        <Box fontSize={dateSize}>{dateNode}</Box>
      </CardContent>

      <CardActions>{actionNode}</CardActions>
    </Card>
  )
}

const useResponsiveViewDetailsButton = (): {
  fullWidth: boolean
} => {
  const theme = useTheme()
  const matchesSm = useMediaQuery(theme.breakpoints.up('sm'))

  return {
    fullWidth: !matchesSm
  }
}

const ViewDetailsButton: React.FC<{
  active?: boolean
  onShowDetails?(): void
}> = React.memo(({ active, onShowDetails }) => {
  const { fullWidth } = useResponsiveViewDetailsButton()

  return (
    <Button
      fullWidth={fullWidth}
      color="primary"
      size="small"
      variant={active ? 'outlined' : 'contained'}
      onClick={onShowDetails}
    >
      {fullWidth ? 'Details' : 'Show Details'}
    </Button>
  )
})

const DayCard: React.FC<{
  active?: boolean
  unitsChanging?: boolean
  units: TempUnits
  forecast: DayForecast
  onShowDetails?(): void
}> = React.memo(({ active, unitsChanging, units, forecast, onShowDetails }) => (
  <ViewCard
    data-cy="day-card__root"
    raised={active}
    tempNode={
      unitsChanging ? (
        <Skeleton />
      ) : (
        formatTempUnits(forecast.getAverageTemp(), units)
      )
    }
    dateNode={forecast.getDate().format('DD MMM YY')}
    actionNode={
      <ViewDetailsButton active={active} onShowDetails={onShowDetails} />
    }
  />
))

export default DayCard

// S K E L E T O N

export const SkeletonDayCard: React.FC = React.memo(() => {
  const { fullWidth } = useResponsiveViewDetailsButton()

  return (
    <ViewCard
      elevation={1}
      tempNode={<Skeleton />}
      dateNode={<Skeleton />}
      actionNode={
        <Skeleton
          variant="rect"
          width={fullWidth ? '100%' : '122px'}
          height="30px"
        />
      }
    />
  )
})

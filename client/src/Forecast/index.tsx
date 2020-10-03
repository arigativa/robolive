import React, { ReactNode, ReactElement, Suspense } from 'react'
import Zoom from '@material-ui/core/Zoom'
import Box from '@material-ui/core/Box'
import Radio from '@material-ui/core/Radio'
import RadioGroup, { RadioGroupProps } from '@material-ui/core/RadioGroup'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import IconButton, { IconButtonProps } from '@material-ui/core/IconButton'
import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import ArrowForwardIcon from '@material-ui/icons/ArrowForward'
import Skelet from '@material-ui/lab/Skeleton'
import { Cata, cons } from 'frctl/Basics'
import Maybe from 'frctl/Maybe'
import Either from 'frctl/Either'
import RemoteData from 'frctl/RemoteData'

import { Dispatch, Effect, Effects } from 'core'
import { Coordinates } from 'geo'
import { callOrElse } from 'utils'
import { Forecast, getForecastForCity, getForecastForCoordinates } from 'api'
import TempUnits from 'entities/TempUnits'
import { Error as HttpError } from 'httpBuilder'
import WeekRow, { SkeletonWeekRow } from './WeekRow'
import ErrorReport from './ErrorReport'
import SkeletonChart from './Chart/Skeleton'
import styles from './styles.module.css'

// O R I G I N

export type OriginPattern<R> = Cata<{
  ByCoordinates(coordinates: Coordinates): R
  ByCity(city: string): R
}>

export type Origin = {
  cata<R>(pattern: OriginPattern<R>): R
}

export const ByCoordinates = cons(
  class ByCoordinates_ implements Origin {
    public constructor(private readonly coordinates: Coordinates) {}

    public cata<R>(pattern: OriginPattern<R>): R {
      return callOrElse(pattern._, pattern.ByCoordinates, this.coordinates)
    }
  }
)

export const ByCity = cons(
  class ByCity_ implements Origin {
    public constructor(private readonly city: string) {}

    public cata<R>(pattern: OriginPattern<R>): R {
      return callOrElse(pattern._, pattern.ByCity, this.city)
    }
  }
)

// S T A T E

export type State = {
  origin: Origin
  units: TempUnits
  unitsChanging: boolean
  forecast: RemoteData<HttpError, Forecast>
}

export const getCityName = (state: State): Maybe<string> => {
  return state.forecast.toMaybe().map(({ city }) => city)
}

const loadForecastForOrigin = (
  units: TempUnits,
  origin: Origin
): Effect<Action> => {
  return origin
    .cata({
      ByCity: city => getForecastForCity(units, city),
      ByCoordinates: coordinates =>
        getForecastForCoordinates(units, coordinates)
    })
    .send(LoadForecastDone)
}

const init = (origin: Origin): [State, Effects<Action>] => {
  return reinit(origin, {
    origin,
    units: TempUnits.Fahrenheit,
    unitsChanging: false,
    forecast: RemoteData.Loading
  })
}

export const initByCity = (city: string): [State, Effects<Action>] => {
  return init(ByCity(city))
}

export const initByCoordinates = (
  coordinates: Coordinates
): [State, Effects<Action>] => {
  return init(ByCoordinates(coordinates))
}

const reinit = (origin: Origin, state: State): [State, Effects<Action>] => {
  return [
    {
      ...state,
      origin,
      forecast: RemoteData.Loading
    },
    [loadForecastForOrigin(state.units, origin)]
  ]
}

export const reinitByCity = (
  city: string,
  state: State
): [State, Effects<Action>] => {
  return reinit(ByCity(city), state)
}

export const reinitByCoordinates = (
  coordinates: Coordinates,
  state: State
): [State, Effects<Action>] => {
  return reinit(ByCoordinates(coordinates), state)
}

// U P D A T E

export type Action =
  | { type: 'LoadForecast' }
  | { type: 'LoadForecastDone'; result: Either<HttpError, Forecast> }
  | { type: 'ChangeUnits'; units: TempUnits }

const LoadForecast: Action = { type: 'LoadForecast' }

const LoadForecastDone = (result: Either<HttpError, Forecast>): Action => ({
  type: 'LoadForecastDone',
  result
})

const ChangeUnits = (units: TempUnits): Action => ({
  type: 'ChangeUnits',
  units
})

export const update = (
  action: Action,
  state: State
): [State, Effects<Action>] => {
  switch (action.type) {
    case 'LoadForecast': {
      return [
        {
          ...state,
          forecast: RemoteData.Loading
        },
        [loadForecastForOrigin(state.units, state.origin)]
      ]
    }

    case 'LoadForecastDone': {
      return [
        {
          ...state,
          unitsChanging: false,
          forecast: RemoteData.fromEither(action.result)
        },
        []
      ]
    }

    case 'ChangeUnits': {
      return [
        {
          ...state,
          unitsChanging: true,
          units: action.units
        },
        [loadForecastForOrigin(action.units, state.origin)]
      ]
    }
  }
}

// V I E W

const ViewControlsContainer: React.FC = ({ children }) => (
  <Box paddingX={2} paddingTop={1}>
    {children}
  </Box>
)

const ViewNavigationContainer: React.FC = ({ children }) => (
  <Box display="flex" justifyContent="space-between" marginY={6}>
    {children}
  </Box>
)

const ViewWeekRowContainer: React.FC = ({ children }) => (
  <Box paddingX={1} paddingY={3} className={styles.weekRowContainer}>
    {children}
  </Box>
)

const ViewChartContainer: React.FC = ({ children }) => (
  <Box paddingTop={1} paddingBottom={3}>
    {children}
  </Box>
)

const ViewUnits: React.FC<
  RadioGroupProps & {
    control: ReactElement
    celciusNode: ReactNode
    fahrenheitNode: ReactNode
  }
> = React.memo(({ control, celciusNode, fahrenheitNode, ...props }) => (
  <FormControl component="fieldset" fullWidth>
    <RadioGroup row className={styles.radioGroup} {...props}>
      <FormControlLabel
        data-cy="forecast__radio_metric"
        label={celciusNode}
        value={TempUnits.Celcius}
        control={control}
      />

      <FormControlLabel
        data-cy="forecast__radio_imperial"
        label={fahrenheitNode}
        labelPlacement="start"
        value={TempUnits.Fahrenheit}
        control={control}
      />
    </RadioGroup>
  </FormControl>
))

const ViewNavigationButton: React.FC<
  IconButtonProps & {
    visible: boolean
  }
> = React.memo(({ visible, ...props }) => (
  <Zoom in={visible}>
    <IconButton color="primary" disabled={!visible} {...props} />
  </Zoom>
))

const ViewNavigation: React.FC<{
  prevVisible: boolean
  nextVisible: boolean
  onPrevClick(): void
  onNextClick(): void
}> = React.memo(({ prevVisible, nextVisible, onPrevClick, onNextClick }) => (
  <ViewNavigationContainer>
    <ViewNavigationButton
      data-cy="forecast__navigation_prev"
      aria-label="Scroll to previous day"
      visible={prevVisible}
      onClick={onPrevClick}
    >
      <ArrowBackIcon />
    </ViewNavigationButton>

    <ViewNavigationButton
      data-cy="forecast__navigation_next"
      aria-label="Scroll to next day"
      visible={nextVisible}
      onClick={onNextClick}
    >
      <ArrowForwardIcon />
    </ViewNavigationButton>
  </ViewNavigationContainer>
))

const ViewChart = React.lazy(() => import('./Chart'))

const radioControl = <Radio color="primary" />

const ViewSucceed: React.FC<{
  pageSize: number
  units: TempUnits
  unitsChanging: boolean
  forecast: Forecast
  dispatch: Dispatch<Action>
}> = React.memo(props => {
  const { pageSize, units, unitsChanging, forecast, dispatch } = props
  const [{ shiftIndex, activeIndex }, setState] = React.useState({
    shiftIndex: 0,
    activeIndex: 0
  })

  const onPrevClick = React.useCallback(
    () => setState(state => ({ ...state, shiftIndex: state.shiftIndex - 1 })),
    []
  )
  const onNextClick = React.useCallback(
    () => setState(state => ({ ...state, shiftIndex: state.shiftIndex + 1 })),
    []
  )
  const onShowDetails = React.useCallback(
    index =>
      setState(state => ({ ...state, activeIndex: index - state.shiftIndex })),
    []
  )
  const onChangeUnits = React.useCallback(
    event => dispatch(ChangeUnits(event.currentTarget.value as TempUnits)),
    [dispatch]
  )

  const activeDaySegments = forecast.days[
    shiftIndex + activeIndex
  ].getSegments()

  return (
    <div data-cy="forecast__root">
      <ViewControlsContainer>
        <ViewUnits
          aria-label="Temperature units"
          name="temp-units"
          value={units}
          control={radioControl}
          celciusNode="Celcius"
          fahrenheitNode="Fahrenheit"
          onChange={onChangeUnits}
        />

        <ViewNavigation
          prevVisible={shiftIndex > 0}
          nextVisible={shiftIndex < forecast.days.length - pageSize}
          onPrevClick={onPrevClick}
          onNextClick={onNextClick}
        />
      </ViewControlsContainer>

      <ViewWeekRowContainer>
        <WeekRow
          pageSize={pageSize}
          shiftIndex={shiftIndex}
          activeIndex={shiftIndex + activeIndex}
          units={units}
          unitsChanging={unitsChanging}
          forecastDays={forecast.days}
          onShowDetails={onShowDetails}
        />
      </ViewWeekRowContainer>

      <ViewChartContainer>
        <Suspense fallback={<SkeletonChart />}>
          <ViewChart units={units} segments={activeDaySegments} />
        </Suspense>
      </ViewChartContainer>
    </div>
  )
})

export const View: React.FC<{
  pageSize: number
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ pageSize, state, dispatch }) => {
  const onRetry = React.useCallback(() => dispatch(LoadForecast), [dispatch])

  return state.forecast.cata({
    Loading: () => <Skeleton pageSize={pageSize} />,

    Failure: error => <ErrorReport error={error} onRetry={onRetry} />,

    Succeed: forecast => (
      <ViewSucceed
        pageSize={pageSize}
        units={state.units}
        unitsChanging={state.unitsChanging}
        forecast={forecast}
        dispatch={dispatch}
      />
    )
  })
})

// S K E L E T O N

const SkeletNavButton: React.FC = () => (
  <Skelet variant="circle" width="48px" height="48px" />
)

export const Skeleton: React.FC<{ pageSize: number }> = React.memo(
  ({ pageSize }) => (
    <div data-cy="forecast__skeleton">
      <ViewControlsContainer>
        <ViewUnits
          control={
            <Box
              width="42px"
              height="42px"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Skelet variant="circle" width="20px" height="20px" />
            </Box>
          }
          celciusNode={<Skelet width="54px" />}
          fahrenheitNode={<Skelet width="78px" />}
        />

        <ViewNavigationContainer>
          <SkeletNavButton />
          <SkeletNavButton />
        </ViewNavigationContainer>
      </ViewControlsContainer>

      <ViewWeekRowContainer>
        <SkeletonWeekRow pageSize={pageSize} />
      </ViewWeekRowContainer>

      <ViewChartContainer>
        <SkeletonChart />
      </ViewChartContainer>
    </div>
  )
)

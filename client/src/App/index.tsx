import React from 'react'
import Box from '@material-ui/core/Box'
import Container from '@material-ui/core/Container'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Maybe from 'frctl/Maybe'
import Either from 'frctl/Either'

import { Effects, Dispatch, mapEffects } from 'core'
import { Coordinates, getCurrentLocation } from 'geo'
import * as Forecast from 'Forecast'
import * as TopBar from './TopBar'

// S T A T E

export type State = {
  defaultCity: string
  topbar: TopBar.State
  forecast: Maybe<Forecast.State>
}

export const init = (defaultCity: string): [State, Effects<Action>] => [
  {
    defaultCity,
    topbar: TopBar.initial(''),
    forecast: Maybe.Nothing
  },
  [getCurrentLocation(DetectLocation)]
]

// U P D A T E

export type Action =
  | { type: 'DetectLocation'; coordinates: Either<string, Coordinates> }
  | { type: 'TopBarAction'; subAction: TopBar.Action }
  | { type: 'ForecastAction'; subAction: Forecast.Action }

const DetectLocation = (coordinates: Either<string, Coordinates>): Action => ({
  type: 'DetectLocation',
  coordinates
})

const ForecastAction = (subAction: Forecast.Action): Action => ({
  type: 'ForecastAction',
  subAction
})

const TopBarAction = (subAction: TopBar.Action): Action => ({
  type: 'TopBarAction',
  subAction
})

export const update = (
  action: Action,
  state: State
): [State, Effects<Action>] => {
  switch (action.type) {
    case 'DetectLocation': {
      const nextTopBar = action.coordinates.isRight()
        ? state.topbar
        : TopBar.initial(state.defaultCity)

      const [nextForecast, effectsOfForecast] = state.forecast.cata({
        Nothing: () =>
          action.coordinates
            .map(Forecast.initByCoordinates)
            .getOrElse(Forecast.initByCity(state.defaultCity)),

        Just: forecast =>
          action.coordinates
            .map(coords => Forecast.reinitByCoordinates(coords, forecast))
            .getOrElse(Forecast.reinitByCity(state.defaultCity, forecast))
      })

      return [
        {
          ...state,
          topbar: nextTopBar,
          forecast: Maybe.Just(nextForecast)
        },
        mapEffects(ForecastAction, effectsOfForecast)
      ]
    }

    case 'TopBarAction': {
      return TopBar.update(action.subAction, state.topbar).cata({
        Updated: nextTopBar => [
          {
            ...state,
            topbar: nextTopBar
          },
          []
        ],

        Searched: city => {
          if (city.length === 0) {
            return [state, [getCurrentLocation(DetectLocation)]]
          }

          return state.forecast.cata({
            Nothing: () => [state, []],

            Just: forecast => {
              const [nextForecast, effectsOfForecast] = Forecast.reinitByCity(
                city,
                forecast
              )

              return [
                {
                  ...state,
                  forecast: Maybe.Just(nextForecast)
                },
                mapEffects(ForecastAction, effectsOfForecast)
              ]
            }
          })
        }
      })
    }

    case 'ForecastAction': {
      return state.forecast.cata({
        Nothing: () => [state, []],

        Just: forecast => {
          const [nextForecast, effectsOfForecast] = Forecast.update(
            action.subAction,
            forecast
          )

          const nextTopBar =
            state.topbar.city.trim().length === 0
              ? TopBar.initial(Forecast.getCityName(nextForecast).getOrElse(''))
              : state.topbar

          return [
            {
              ...state,
              topbar: nextTopBar,
              forecast: Maybe.Just(nextForecast)
            },
            mapEffects(ForecastAction, effectsOfForecast)
          ]
        }
      })
    }
  }
}

// V I E W

export const View: React.FC<{ state: State; dispatch: Dispatch<Action> }> = ({
  state,
  dispatch
}) => {
  const topbarDispatch = React.useCallback(
    action => dispatch(TopBarAction(action)),
    [dispatch]
  )

  const forecastDispatch = React.useCallback(
    action => dispatch(ForecastAction(action)),
    [dispatch]
  )

  return (
    <Box>
      <AppBar>
        <Container disableGutters maxWidth="md">
          {state.forecast.isNothing() ? (
            <TopBar.Skeleton />
          ) : (
            <TopBar.View state={state.topbar} dispatch={topbarDispatch} />
          )}
        </Container>
      </AppBar>

      <Toolbar />

      <Box
        display="flex"
        minHeight="100%"
        justifyContent="center"
        alignItems="center"
        padding={2}
      >
        <Container disableGutters maxWidth="md">
          <Box bgcolor="background.paper">
            {state.forecast.cata({
              Nothing: () => <Forecast.Skeleton pageSize={3} />,

              Just: forecast => (
                <Forecast.View
                  pageSize={3}
                  state={forecast}
                  dispatch={forecastDispatch}
                />
              )
            })}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

import React, { ReactNode } from 'react'
import Box from '@material-ui/core/Box'
import Toolbar from '@material-ui/core/Toolbar'
import InputBase from '@material-ui/core/InputBase'
import Typography from '@material-ui/core/Typography'
import IconButton from '@material-ui/core/IconButton'
import SearchIcon from '@material-ui/icons/Search'
import Skelet from '@material-ui/lab/Skeleton'
import {
  createStyles,
  fade,
  Theme,
  makeStyles,
  useTheme
} from '@material-ui/core/styles'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { Cata } from 'frctl/Basics'

import { Dispatch } from 'core'
import { callOrElse } from 'utils'

// S T A T E

export type State = {
  city: string
}

export const initial = (city: string): State => ({ city })

// U P D A T E

export type Action =
  | { type: 'ChangeCity'; city: string }
  | { type: 'SearchForCity' }

const ChangeCity = (city: string): Action => ({ type: 'ChangeCity', city })

const SearchForCity: Action = { type: 'SearchForCity' }

export type StagePattern<R> = Cata<{
  Updated(nextState: State): R
  Searched(city: string): R
}>

export type Stage = {
  cata<R>(pattern: StagePattern<R>): R
}

class Updated implements Stage {
  constructor(private readonly nextState: State) {}

  public cata<R>(pattern: StagePattern<R>): R {
    return callOrElse(pattern._, pattern.Updated, this.nextState)
  }
}

class Searched implements Stage {
  constructor(private readonly city: string) {}

  public cata<R>(pattern: StagePattern<R>): R {
    return callOrElse(pattern._, pattern.Searched, this.city)
  }
}

export const update = (action: Action, state: State): Stage => {
  switch (action.type) {
    case 'ChangeCity': {
      return new Updated({
        ...state,
        city: action.city
      })
    }

    case 'SearchForCity': {
      return new Searched(state.city.trim())
    }
  }
}

// V I E W

const ViewSearchButtonContainer: React.FC = ({ children }) => (
  <Box display="inline-block" marginLeft={1}>
    {children}
  </Box>
)

const useCityhInputStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      color: 'inherit'
    },

    input: {
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1, 2),
      backgroundColor: fade(theme.palette.common.white, 0.15),
      transition: theme.transitions.create('width'),
      width: '12ch',
      '&:focus': {
        backgroundColor: fade(theme.palette.common.white, 0.25),
        [theme.breakpoints.up('sm')]: {
          width: '20ch'
        }
      },
      '&:hover': {
        backgroundColor: fade(theme.palette.common.white, 0.25)
      }
    }
  })
)

const ViewCityInput: React.FC<{
  value: string
  dispatch: Dispatch<Action>
}> = ({ value, dispatch }) => {
  const classes = useCityhInputStyles()

  return (
    <form
      onSubmit={event => {
        dispatch(SearchForCity)
        event.preventDefault()
      }}
    >
      <InputBase
        placeholder="City name…"
        classes={{
          root: classes.root,
          input: classes.input
        }}
        inputProps={{ 'aria-label': 'City Name' }}
        value={value}
        onChange={event => dispatch(ChangeCity(event.currentTarget.value))}
      />

      <ViewSearchButtonContainer>
        <IconButton
          type="submit"
          color="inherit"
          aria-label="Search Forecast for City"
        >
          <SearchIcon />
        </IconButton>
      </ViewSearchButtonContainer>
    </form>
  )
}

const ViewRoot: React.FC<{ title: ReactNode }> = ({ title, children }) => (
  <Toolbar>
    <Box flexGrow={1}>
      <Typography variant="h6" noWrap>
        {title}
      </Typography>
    </Box>

    {children}
  </Toolbar>
)

const useBigTitle = (): boolean => {
  const theme = useTheme()

  return useMediaQuery(theme.breakpoints.up('sm'))
}

export const View: React.FC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => (
  <ViewRoot title={useBigTitle() ? 'Weather Forecast' : 'WF'}>
    <ViewCityInput value={state.city} dispatch={dispatch} />
  </ViewRoot>
))

export const Skeleton: React.FC = React.memo(() => (
  <ViewRoot title={<Skelet width={useBigTitle() ? '165px' : '30px'} />}>
    <Skelet variant="rect" width="139px" height="35px" />
    <ViewSearchButtonContainer>
      <Skelet variant="circle" width="48px" height="48px" />
    </ViewSearchButtonContainer>
  </ViewRoot>
))

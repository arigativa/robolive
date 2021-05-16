import React from 'react'
import Maybe from 'frctl/Maybe'
import Decode, { Decoder } from 'decode-json'
import { Tooltip, ButtonGroup, IconButton } from '@chakra-ui/react'
import { AddIcon, MinusIcon } from '@chakra-ui/icons'

import { Dispatch, Cmd } from 'core'
import { Case } from 'utils'
import { SkeletonRect } from 'Skeleton'

const LOCALSTORAGE_KEY = '__robolibe_preferences__'

export abstract class Preferences {
  public abstract readonly showTextarea: boolean
  public abstract readonly showTemplates: boolean
  public abstract readonly showInfoLog: boolean

  public static defaults: Preferences = {
    showTextarea: true,
    showTemplates: true,
    showInfoLog: true
  }

  public static toggle(
    key: keyof Preferences,
    preferences: Preferences
  ): Preferences {
    return { ...preferences, [key]: !preferences[key] }
  }

  public static decoder: Decoder<Preferences> = Decode.shape({
    showTextarea: Decode.index(0).boolean,
    showTemplates: Decode.index(1).boolean,
    showInfoLog: Decode.index(2).boolean
  })

  public static encode(preferences: Preferences): unknown {
    return [
      preferences.showTextarea,
      preferences.showTemplates,
      preferences.showInfoLog
    ]
  }
}

// S T A T E

export type State = Maybe<Preferences>

export const initialState: State = Maybe.Nothing

export const withDefaults = (state: State): Preferences => {
  return state.getOrElse(Preferences.defaults)
}

export const initialCmd: Cmd<Action> = Cmd.create<Action>(done => {
  const json = localStorage.getItem(LOCALSTORAGE_KEY)
  const result = Preferences.decoder.decodeJSON(json ?? '')

  done(
    ReadLocalPreferences({ preferences: result.value ?? Preferences.defaults })
  )
})

// U P D A T E

export type Action =
  | Case<'NoOp'>
  | Case<'ReadLocalPreferences', { preferences: Preferences }>
  | Case<'ChangePreferences', { key: keyof Preferences }>

const NoOp = Case.of<Action, 'NoOp'>('NoOp')()
const ReadLocalPreferences = Case.of<Action, 'ReadLocalPreferences'>(
  'ReadLocalPreferences'
)
const ChangePreferences = Case.of<Action, 'ChangePreferences'>(
  'ChangePreferences'
)
export const update = (action: Action, state: State): [State, Cmd<Action>] => {
  if (action.type === 'NoOp') {
    return [state, Cmd.none]
  }

  if (action.type === 'ReadLocalPreferences') {
    return [Maybe.Just(action.preferences), Cmd.none]
  }

  return state
    .map(preferenes => Preferences.toggle(action.key, preferenes))
    .cata<[State, Cmd<Action>]>({
      Nothing: () => [state, Cmd.none],

      Just: newPreferenes => [
        Maybe.Just(newPreferenes),

        Cmd.create<Action>(done => {
          localStorage.setItem(
            LOCALSTORAGE_KEY,
            JSON.stringify(Preferences.encode(newPreferenes))
          )

          done(NoOp)
        })
      ]
    })
}

// V I E W

const PREFS: ReadonlyArray<[keyof Preferences, string]> = [
  ['showTextarea', 'Show Info Textarea'],
  ['showTemplates', 'Show Template Buttons'],
  ['showInfoLog', 'Show Messages Log']
]

const ViewPref: React.VFC<{
  shifted: boolean
  label: string
  checked: boolean
  onClick(): void
}> = ({ shifted, label, checked, onClick }) => (
  <Tooltip aria-label="Change preference" label={label}>
    <IconButton
      aria-label={label}
      icon={checked ? <AddIcon /> : <MinusIcon />}
      ml={shifted ? '-px' : 0}
      colorScheme="teal"
      variant={checked ? 'solid' : 'outline'}
      onClick={onClick}
    />
  </Tooltip>
)

export const View: React.VFC<{
  state: State
  dispatch: Dispatch<Action>
}> = React.memo(({ state, dispatch }) => {
  return state.cata({
    Nothing: () => <Skeleton />,

    Just: preferneces => (
      <ButtonGroup isAttached size="xs">
        {PREFS.map(([key, label], index) => (
          <ViewPref
            key={key}
            shifted={index > 0}
            label={label}
            checked={preferneces[key]}
            onClick={() => dispatch(ChangePreferences({ key }))}
          />
        ))}
      </ButtonGroup>
    )
  })
})

// S K E L E T O N

export const Skeleton: React.VFC = React.memo(() => (
  <SkeletonRect width={70} height={24} />
))

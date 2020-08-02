module Debounce exposing (Debounce, Tick, bounce, getValue, push)

import Process
import Task


type alias State a =
    { size : Int
    , value : Maybe a
    , delay : Float
    }


type Debounce a
    = Debounce (State a)


bounce : Float -> Debounce a
bounce ms =
    Debounce (State 0 Nothing ms)


type Tick
    = Tick Int


getValue : Tick -> Debounce a -> Maybe a
getValue (Tick lastSize) (Debounce state) =
    if lastSize == state.size then
        state.value

    else
        Nothing


{-| Push a value into the debouncer.
-}
push : a -> Debounce a -> ( Debounce a, Cmd Tick )
push value (Debounce state) =
    ( Debounce
        { state
            | size = state.size + 1
            , value = Just value
        }
    , Task.perform
        (\_ -> Tick (state.size + 1))
        (Process.sleep state.delay)
    )

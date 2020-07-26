module Debounce exposing (Debounce, Msg, bounce, push, update)

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


type Msg
    = Tick Int


update : Msg -> Debounce a -> Maybe a
update (Tick lastSize) (Debounce state) =
    if lastSize == state.size then
        state.value

    else
        Nothing


{-| Push a value into the debouncer.
-}
push : a -> Debounce a -> ( Debounce a, Cmd Msg )
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

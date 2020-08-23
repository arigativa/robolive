module Throttle exposing (Throttle, Tick, getValue, init, push, tick, update)

import Process
import Task


type alias State a =
    { hold : Bool
    , value : a
    , delay : Float
    }


type Throttle a
    = Throttle (State a)


init : Float -> a -> Throttle a
init ms initialValue =
    Throttle (State False initialValue ms)


type Tick
    = Tick


getValue : Throttle a -> a
getValue (Throttle state) =
    state.value


{-| Push a value into the Throttler.
-}
push : a -> Throttle a -> ( Throttle a, Cmd Tick )
push value throttle =
    update (always value) throttle


update : (a -> a) -> Throttle a -> ( Throttle a, Cmd Tick )
update predicate (Throttle state) =
    ( Throttle
        { state
            | hold = True
            , value = predicate state.value
        }
    , if state.hold then
        Cmd.none

      else
        Task.perform (always Tick) (Process.sleep state.delay)
    )


tick : Tick -> Throttle a -> Throttle a
tick _ (Throttle state) =
    Throttle { state | hold = False }

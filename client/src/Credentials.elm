module Credentials exposing (Credentials)

import Json.Encode exposing (Value)


type alias Credentials =
    { username : String
    , userAgent : Value
    }

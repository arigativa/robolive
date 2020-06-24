module Credentials exposing (Credentials)

import JsSIP


type alias Credentials =
    { username : String
    , userAgent : JsSIP.UserAgent
    }

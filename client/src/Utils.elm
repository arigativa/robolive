module Utils exposing (hasWhitespaces)

import Regex


hasWhitespaces : String -> Bool
hasWhitespaces =
    ".*\\s+.*"
        |> Regex.fromString
        |> Maybe.withDefault Regex.never
        |> Regex.contains

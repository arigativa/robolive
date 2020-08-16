module Utils exposing (hasWhitespaces, ifelse)

import Regex


ifelse : Bool -> x -> x -> x
ifelse condition onTrue onFalse =
    if condition then
        onTrue

    else
        onFalse


hasWhitespaces : String -> Bool
hasWhitespaces =
    ".*\\s+.*"
        |> Regex.fromString
        |> Maybe.withDefault Regex.never
        |> Regex.contains

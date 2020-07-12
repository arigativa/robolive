module RemoteControl exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Events
import Html exposing (Html, div, text)
import Html.Events
import Json.Decode as Decode



-- M O D E L


type alias Model =
    Maybe Int


initial : Model
initial =
    Nothing



-- U P D A T E


type Msg
    = KeyDown Int
    | KeyUp


update : Msg -> Model
update msg =
    case msg of
        KeyDown code ->
            Just code

        KeyUp ->
            Nothing



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    if model == Nothing then
        Browser.Events.onKeyDown (Decode.map KeyDown Html.Events.keyCode)

    else
        Browser.Events.onKeyUp (Decode.succeed KeyUp)



-- V I E W


view : Model -> Html Msg
view model =
    div []
        [ case model of
            Nothing ->
                text "press key"

            Just code ->
                text ("key " ++ String.fromInt code ++ " pressed")
        ]

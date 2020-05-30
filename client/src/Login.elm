module Login exposing (Model, Msg, initial, update, view)

import Html exposing (Html, button, div, input, text)
import Html.Attributes
import Html.Events
import RemoteData exposing (RemoteData)



-- M O D E L


type alias Model =
    { name : String
    , signingIn : RemoteData String Never
    }


initial : Model
initial =
    { name = ""
    , signingIn = RemoteData.NotAsked
    }



-- U P D A T E


type Msg
    = ChangeName String
    | SignIn


update : Msg -> Model -> Model
update msg model =
    case msg of
        ChangeName nextName ->
            { model | name = nextName }

        SignIn ->
            model



-- V I E W


view : Model -> Html Msg
view model =
    div []
        [ input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.placeholder "Your Name"
            , Html.Attributes.value model.name
            , Html.Events.onInput ChangeName
            ]
            []
        , button
            [ Html.Attributes.type_ "button"
            , Html.Attributes.disabled (String.isEmpty (String.trim model.name))
            , Html.Events.onClick SignIn
            ]
            [ text "Sign In"
            ]
        ]

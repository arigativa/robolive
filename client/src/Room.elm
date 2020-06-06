module Room exposing (Model, Msg, init, subscriptions, update, view)

import Html exposing (Html, div, h1, i, p, text)



-- M O D E L


type alias Model =
    { username : String
    }


init : String -> Model
init username =
    { username = username
    }



-- U P D A T E


type Msg
    = NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- V I E W


view : Model -> Html Msg
view model =
    div
        []
        [ h1 [] [ text "Dashboard" ]
        , p [] [ text "Hey ", i [] [ text model.username ] ]
        ]

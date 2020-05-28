module Main exposing (main)

import Browser
import Browser.Navigation
import Html exposing (br, button, text)
import Html.Events
import Url exposing (Url)


type alias Model =
    { url : Url
    , key : Browser.Navigation.Key
    , count : Int
    }


init : () -> Url -> Browser.Navigation.Key -> ( Model, Cmd Msg )
init () url key =
    ( Model url key 0
    , Cmd.none
    )


type Msg
    = Decrement
    | Increment
    | UrlRequested Browser.UrlRequest
    | UrlChanged Url.Url


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Decrement ->
            ( { model | count = model.count - 1 }
            , Cmd.none
            )

        Increment ->
            ( { model | count = model.count + 1 }
            , Cmd.none
            )

        UrlRequested (Browser.Internal url) ->
            ( model
            , Browser.Navigation.pushUrl model.key (Url.toString url)
            )

        UrlRequested (Browser.External href) ->
            ( model, Browser.Navigation.load href )

        UrlChanged url ->
            ( { model | url = url }
            , Cmd.none
            )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


view : Model -> Browser.Document Msg
view model =
    Browser.Document "Robolive"
        [ text "Welcome to the counter app"
        , br [] []
        , text ("Current Url is " ++ Url.toString model.url)
        , br [] []
        , button [Html.Events.onClick Decrement] [ text "-" ]
        , text (String.fromInt model.count)
        , button [Html.Events.onClick Increment] [ text "+" ]
        ]



-- P R O G R A M


main : Program () Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = UrlRequested
        , onUrlChange = UrlChanged
        }

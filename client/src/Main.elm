module Main exposing (main)

import Browser
import Browser.Navigation
import Html
import Login
import Url exposing (Url)



-- M O D E L


type Screen
    = LoginScreen Login.Model


type alias Model =
    { key : Browser.Navigation.Key
    , screen : Screen
    }


init : () -> Url -> Browser.Navigation.Key -> ( Model, Cmd Msg )
init _ _ key =
    ( { key = key
      , screen = LoginScreen Login.initial
      }
    , Cmd.none
    )



-- U P D A T E


type Msg
    = UrlRequested Browser.UrlRequest
    | UrlChanged Url.Url
    | LoginMsg Login.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case ( msg, model.screen ) of
        ( UrlRequested (Browser.Internal url), _ ) ->
            ( model
            , Browser.Navigation.pushUrl model.key (Url.toString url)
            )

        ( UrlRequested (Browser.External href), _ ) ->
            ( model, Browser.Navigation.load href )

        ( UrlChanged _, _ ) ->
            ( model, Cmd.none )

        ( LoginMsg msgOfLogin, LoginScreen login ) ->
            let
                ( nextLogin, cmdOfLogin ) =
                    Login.update msgOfLogin login
            in
            ( { model | screen = LoginScreen nextLogin }
            , Cmd.map LoginMsg cmdOfLogin
            )



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- V I E W


view : Model -> Browser.Document Msg
view model =
    Browser.Document "Robolive"
        [ case model.screen of
            LoginScreen login ->
                Html.map LoginMsg (Login.view login)
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

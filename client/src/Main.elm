module Main exposing (main)

import Browser
import Browser.Navigation
import Html
import Login
import Room
import Url exposing (Url)



-- M O D E L


type Screen
    = LoginScreen Login.Model
    | RoomScreen Room.Model


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
    | RoomMsg Room.Msg


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
            case Login.update msgOfLogin login of
                Login.Updated ( nextLogin, cmdOfLogin ) ->
                    ( { model | screen = LoginScreen nextLogin }
                    , Cmd.map LoginMsg cmdOfLogin
                    )

                Login.Registred username ->
                    ( { model | screen = RoomScreen (Room.init username) }
                    , Cmd.none
                    )

        ( LoginMsg _, _ ) ->
            ( model, Cmd.none )

        ( RoomMsg msgOfRoom, RoomScreen room ) ->
            let
                ( nextRoom, cmdOfRoom ) =
                    Room.update msgOfRoom room
            in
            ( { model | screen = RoomScreen nextRoom }
            , Cmd.map RoomMsg cmdOfRoom
            )

        ( RoomMsg _, _ ) ->
            ( model, Cmd.none )



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    case model.screen of
        LoginScreen login ->
            Sub.map LoginMsg (Login.subscriptions login)

        RoomScreen room ->
            Sub.map RoomMsg (Room.subscriptions room)



-- V I E W


view : Model -> Browser.Document Msg
view model =
    Browser.Document "Robolive"
        [ case model.screen of
            LoginScreen login ->
                Html.map LoginMsg (Login.view login)

            RoomScreen room ->
                Html.map RoomMsg (Room.view room)
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

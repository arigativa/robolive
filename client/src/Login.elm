module Login exposing (Model, Msg, Stage(..), initial, subscriptions, update, view)

import Html exposing (Html, button, form, h1, input, p, strong, text)
import Html.Attributes
import Html.Events
import JsSIP
import Regex
import RemoteData exposing (RemoteData)


hasWhitespaces : String -> Bool
hasWhitespaces =
    ".*\\s+.*"
        |> Regex.fromString
        |> Maybe.withDefault Regex.never
        |> Regex.contains



-- M O D E L


type alias Model =
    { username : String
    , registration : RemoteData String Never
    }


initial : Model
initial =
    { username = ""
    , registration = RemoteData.NotAsked
    }



-- U P D A T E


type Msg
    = ChangeUsername String
    | SignIn
    | Register (Result JsSIP.RegistrationError ())


type Stage
    = Updated ( Model, Cmd Msg )
    | Registred String


update : Msg -> Model -> Stage
update msg model =
    case msg of
        ChangeUsername nextUsername ->
            Updated
                ( { model
                    | username = nextUsername
                    , registration = RemoteData.NotAsked
                  }
                , Cmd.none
                )

        SignIn ->
            if hasWhitespaces model.username then
                Updated
                    ( { model | registration = RemoteData.Failure "Username must have no white spaces" }
                    , Cmd.none
                    )

            else if String.isEmpty model.username then
                Updated
                    ( { model | registration = RemoteData.Failure "Username must be not empty" }
                    , Cmd.none
                    )

            else
                Updated
                    ( { model | registration = RemoteData.Loading }
                    , JsSIP.register
                        { protocol = JsSIP.WebSocket
                        , server = "127.0.0.1"
                        , port_ = Just 4443
                        , register = True
                        , username = model.username
                        , password = Nothing
                        }
                    )

        Register (Err error) ->
            Updated
                ( { model | registration = RemoteData.Failure error.reason }
                , Cmd.none
                )

        Register (Ok _) ->
            Registred model.username



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    if RemoteData.isLoading model.registration then
        JsSIP.onRegistred Register

    else
        Sub.none



-- V I E W


view : Model -> Html Msg
view model =
    let
        ( busy, error ) =
            case model.registration of
                RemoteData.Loading ->
                    ( True, Nothing )

                RemoteData.Failure reason ->
                    ( False, Just reason )

                _ ->
                    ( False, Nothing )
    in
    form
        [ Html.Events.onSubmit SignIn
        ]
        [ h1
            []
            [ text "Registration"
            ]

        --
        , input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.placeholder "Username"
            , Html.Attributes.value model.username
            , Html.Attributes.readonly busy
            , Html.Attributes.tabindex 0
            , Html.Attributes.autofocus True
            , Html.Events.onInput ChangeUsername
            ]
            []
        , button
            [ Html.Attributes.type_ "submit"
            , Html.Attributes.disabled busy
            , Html.Attributes.tabindex 0
            ]
            [ text "Sign In"
            ]

        --
        , case error of
            Nothing ->
                text ""

            Just reason ->
                p
                    []
                    [ strong [] [ text "Registration failed: " ]
                    , text reason
                    ]
        ]

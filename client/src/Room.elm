module Room exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Dom
import Credentials exposing (Credentials)
import Html exposing (Html, b, button, div, form, h1, h3, input, label, p, strong, text, video)
import Html.Attributes
import Html.Events
import JsSIP exposing (IceServer)
import List.Extra
import RemoteData exposing (RemoteData)
import Task
import Utils exposing (hasWhitespaces)


interlocutorInputID : String
interlocutorInputID =
    "__interlocutor_input__"



-- M O D E L


type alias IceServer =
    { active : Bool
    , url : String
    , username : String
    , password : String
    }


convertIceServer : IceServer -> Maybe JsSIP.IceServer
convertIceServer iceServer =
    if not iceServer.active then
        Nothing

    else if isTurnServer iceServer.url then
        Just
            { url = iceServer.url
            , username = Just iceServer.username
            , password = Just iceServer.password
            }

    else
        Just
            { url = iceServer.url
            , username = Nothing
            , password = Nothing
            }


isTurnServer : String -> Bool
isTurnServer url =
    String.startsWith "turn:" url || String.startsWith "turns:" url


type alias Model =
    { iceServers : List IceServer
    , interlocutor : String
    , call : RemoteData String JsSIP.MediaStream
    }


initial : ( Model, Cmd Msg )
initial =
    ( { iceServers = []
      , interlocutor = "robomachine"
      , call = RemoteData.NotAsked
      }
    , Task.attempt (always NoOp) (Browser.Dom.focus interlocutorInputID)
    )



-- U P D A T E


type Msg
    = NoOp
    | AddIceServer String
    | ChangeIceServerUrl Int String
    | ChangeTurnServerUsername Int String
    | ChangeTurnServerPassword Int String
    | ActivateIceServer Int Bool
    | ChangeInterlocutor String
    | Call JsSIP.UserAgent
    | CallDone (Result String JsSIP.MediaStream)
    | CallEnd
    | Hangup


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

        AddIceServer initialUrl ->
            ( { model | iceServers = model.iceServers ++ [ IceServer True initialUrl "" "" ] }
            , Cmd.none
            )

        ChangeIceServerUrl index "" ->
            ( { model | iceServers = List.Extra.removeAt index model.iceServers }
            , Cmd.none
            )

        ChangeIceServerUrl index url ->
            let
                updateIceServer iceServer =
                    { iceServer | url = url }
            in
            ( { model | iceServers = List.Extra.updateAt index updateIceServer model.iceServers }
            , Cmd.none
            )

        ChangeTurnServerUsername index username ->
            let
                updateIceServer iceServer =
                    { iceServer | username = username }
            in
            ( { model | iceServers = List.Extra.updateAt index updateIceServer model.iceServers }
            , Cmd.none
            )

        ChangeTurnServerPassword index password ->
            let
                updateIceServer iceServer =
                    { iceServer | password = password }
            in
            ( { model | iceServers = List.Extra.updateAt index updateIceServer model.iceServers }
            , Cmd.none
            )

        ActivateIceServer index active ->
            let
                updateIceServer iceServer =
                    { iceServer | active = active }
            in
            ( { model | iceServers = List.Extra.updateAt index updateIceServer model.iceServers }
            , Cmd.none
            )

        ChangeInterlocutor nextInterlocutor ->
            ( { model | interlocutor = nextInterlocutor }
            , Cmd.none
            )

        Call userAgent ->
            if hasWhitespaces model.interlocutor then
                ( { model | call = RemoteData.Failure "Interlocutor must have no white spaces" }
                , Cmd.none
                )

            else if String.isEmpty model.interlocutor then
                ( { model | call = RemoteData.Failure "Interlocutor must be not empty" }
                , Cmd.none
                )

            else
                ( { model | call = RemoteData.Loading }
                , JsSIP.call
                    { userAgent = userAgent
                    , server = "rl.arigativa.ru"
                    , username = model.interlocutor
                    , withAudio = False
                    , withVideo = True
                    , iceServers = List.filterMap convertIceServer model.iceServers
                    }
                )

        CallDone result ->
            ( { model | call = RemoteData.fromResult result }
            , Cmd.none
            )

        CallEnd ->
            ( { model | call = RemoteData.NotAsked }
            , Cmd.none
            )

        Hangup ->
            ( { model | call = RemoteData.NotAsked }
            , JsSIP.hangup
            )



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    case model.call of
        RemoteData.Loading ->
            JsSIP.onCalled CallDone

        RemoteData.Success _ ->
            JsSIP.onEnd CallEnd

        _ ->
            Sub.none



-- V I E W


viewIceServerContainer : List (Html msg) -> Html msg
viewIceServerContainer =
    div
        [ Html.Attributes.style "margin-bottom" "5px"
        ]


viewIceServerCreator : Bool -> Html Msg
viewIceServerCreator disabled =
    viewIceServerContainer
        [ input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.tabindex 0
            , Html.Attributes.placeholder "stun:127.0.0.1"
            , Html.Attributes.disabled disabled
            , Html.Events.onInput AddIceServer
            ]
            []
        ]


viewIceServerChanger : Bool -> Int -> IceServer -> Html Msg
viewIceServerChanger disabled index { active, url, username, password } =
    let
        hasCredentials =
            isTurnServer url
    in
    viewIceServerContainer
        [ input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.tabindex 0
            , Html.Attributes.value url
            , Html.Attributes.disabled (disabled || not active)
            , Html.Events.onInput (ChangeIceServerUrl index)
            ]
            []

        --
        , if hasCredentials then
            input
                [ Html.Attributes.type_ "email"
                , Html.Attributes.tabindex 0
                , Html.Attributes.value username
                , Html.Attributes.placeholder "username"
                , Html.Attributes.disabled (disabled || not active)
                , Html.Events.onInput (ChangeTurnServerUsername index)
                ]
                []

          else
            text ""

        --
        , if hasCredentials then
            input
                [ Html.Attributes.type_ "password"
                , Html.Attributes.tabindex 0
                , Html.Attributes.value password
                , Html.Attributes.placeholder "password"
                , Html.Attributes.disabled (disabled || not active)
                , Html.Events.onInput (ChangeTurnServerPassword index)
                ]
                []

          else
            text ""

        --
        , label
            []
            [ input
                [ Html.Attributes.type_ "checkbox"
                , Html.Attributes.tabindex 0
                , Html.Attributes.checked active
                , Html.Attributes.disabled disabled
                , Html.Events.onCheck (ActivateIceServer index)
                ]
                []
            , if active then
                text "use"

              else
                text "ignore"
            ]
        ]


viewIceServers : Bool -> List IceServer -> Html Msg
viewIceServers disabled iceServers =
    List.indexedMap (viewIceServerChanger disabled) iceServers
        ++ [ viewIceServerCreator disabled ]
        |> div
            [ Html.Attributes.style "margin-bottom" "15px"
            ]


viewCallForm : Credentials -> Bool -> Maybe String -> List IceServer -> String -> Html Msg
viewCallForm credentials busy error iceServers interlocutor =
    form
        [ Html.Events.onSubmit (Call credentials.userAgent)
        ]
        [ button
            [ Html.Attributes.type_ "submit"
            , Html.Attributes.disabled busy
            , Html.Attributes.tabindex 0
            ]
            [ text "Call to "
            ]
        , input
            [ Html.Attributes.id interlocutorInputID
            , Html.Attributes.type_ "text"
            , Html.Attributes.placeholder "Interlocutor"
            , Html.Attributes.value interlocutor
            , Html.Attributes.readonly busy
            , Html.Attributes.tabindex 0
            , Html.Attributes.autofocus True
            , Html.Events.onInput ChangeInterlocutor
            ]
            []

        --
        , h3
            []
            [ text "Ice Servers"
            ]
        , viewIceServers busy iceServers

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


view : Credentials -> Model -> Html Msg
view credentials model =
    div
        []
        [ h1 [] [ text "Room" ]

        --
        , p []
            [ text "Hey "
            , b [] [ text credentials.username ]
            ]

        --
        , case model.call of
            RemoteData.NotAsked ->
                viewCallForm credentials False Nothing model.iceServers model.interlocutor

            RemoteData.Loading ->
                viewCallForm credentials True Nothing model.iceServers model.interlocutor

            RemoteData.Failure reason ->
                viewCallForm credentials False (Just reason) model.iceServers model.interlocutor

            RemoteData.Success stream ->
                div []
                    [ p []
                        [ text "In call with "
                        , b [] [ text model.interlocutor ]
                        , button
                            [ Html.Attributes.type_ "button"
                            , Html.Attributes.tabindex 0
                            , Html.Events.onClick Hangup
                            ]
                            [ text "Hangup" ]
                        ]
                    , video
                        [ Html.Attributes.autoplay True
                        , JsSIP.srcObject stream
                        ]
                        []
                    ]
        ]

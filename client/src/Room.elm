module Room exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Dom
import Credentials exposing (Credentials)
import Html exposing (Html, b, button, div, form, h1, h3, input, p, strong, text, video)
import Html.Attributes
import Html.Events
import JsSIP
import RemoteData exposing (RemoteData)
import Task
import Utils exposing (hasWhitespaces)


interlocutorInputID : String
interlocutorInputID =
    "__interlocutor_input__"



-- M O D E L


type alias Model =
    { iceServers : List String
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
    | ChangeIceServer Int String
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

        AddIceServer initialValue ->
            ( { model | iceServers = model.iceServers ++ [ initialValue ] }
            , Cmd.none
            )

        ChangeIceServer index value ->
            let
                before =
                    List.take index model.iceServers

                after =
                    List.drop (index + 1) model.iceServers

                nextIceServers =
                    if String.isEmpty value then
                        before ++ after

                    else
                        before ++ value :: after
            in
            ( { model | iceServers = nextIceServers }
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
                    , iceServers = model.iceServers
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


viewIceServerCreator : Bool -> Html Msg
viewIceServerCreator disabled =
    input
        [ Html.Attributes.type_ "text"
        , Html.Attributes.tabindex 0
        , Html.Attributes.disabled disabled
        , Html.Events.onInput AddIceServer
        ]
        []


viewIceServerChanger : Bool -> Int -> String -> Html Msg
viewIceServerChanger disabled index value =
    input
        [ Html.Attributes.type_ "text"
        , Html.Attributes.tabindex 0
        , Html.Attributes.value value
        , Html.Attributes.disabled disabled
        , Html.Events.onInput (ChangeIceServer index)
        ]
        []


viewIceServerContainer : List (Html msg) -> Html msg
viewIceServerContainer =
    div
        [ Html.Attributes.style "margin-bottom" "5px"
        ]


viewIceServers : Bool -> List String -> Html Msg
viewIceServers disabled values =
    List.indexedMap (viewIceServerChanger disabled) values
        ++ [ viewIceServerCreator disabled ]
        |> List.map (viewIceServerContainer << List.singleton)
        |> div
            [ Html.Attributes.style "margin-bottom" "15px"
            ]


viewCallForm : Credentials -> Bool -> Maybe String -> List String -> String -> Html Msg
viewCallForm credentials busy error iceServers interlocutor =
    form
        [ Html.Events.onSubmit (Call credentials.userAgent)
        ]
        [ h3
            []
            [ text "Ice Servers"
            ]
        , viewIceServers busy iceServers

        --
        , button
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

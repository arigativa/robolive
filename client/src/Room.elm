module Room exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Dom
import Credentials exposing (Credentials)
import Html exposing (Html, b, button, div, form, h1, h3, input, label, p, strong, text, video)
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
    { iceServers : List ( Bool, String )
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

        AddIceServer initialValue ->
            ( { model | iceServers = model.iceServers ++ [ ( True, initialValue ) ] }
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
                        before ++ ( True, value ) :: after
            in
            ( { model | iceServers = nextIceServers }
            , Cmd.none
            )

        ActivateIceServer index active ->
            ( case List.drop index model.iceServers of
                [] ->
                    model

                ( _, value ) :: after ->
                    { model | iceServers = List.take index model.iceServers ++ ( active, value ) :: after }
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
                    , iceServers = List.map Tuple.second (List.filter Tuple.first model.iceServers)
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


viewIceServerChanger : Bool -> Int -> ( Bool, String ) -> Html Msg
viewIceServerChanger disabled index ( active, value ) =
    viewIceServerContainer
        [ input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.tabindex 0
            , Html.Attributes.value value
            , Html.Attributes.disabled (disabled || not active)
            , Html.Events.onInput (ChangeIceServer index)
            ]
            []
        , label
            []
            [ input
                [ Html.Attributes.type_ "checkbox"
                , Html.Attributes.tabindex 0
                , Html.Attributes.checked active
                , Html.Events.onCheck (ActivateIceServer index)
                ]
                []
            , if active then
                text "use"

              else
                text "ignore"
            ]
        ]


viewIceServers : Bool -> List ( Bool, String ) -> Html Msg
viewIceServers disabled iceServers =
    List.indexedMap (viewIceServerChanger disabled) iceServers
        ++ [ viewIceServerCreator disabled ]
        |> div
            [ Html.Attributes.style "margin-bottom" "15px"
            ]


viewCallForm : Credentials -> Bool -> Maybe String -> List ( Bool, String ) -> String -> Html Msg
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

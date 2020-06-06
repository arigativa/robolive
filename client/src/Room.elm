module Room exposing (Model, Msg, initial, update, view)

import Credentials exposing (Credentials)
import Html exposing (Html, button, div, form, h1, i, input, p, strong, text)
import Html.Attributes
import Html.Events
import Json.Encode as Encode exposing (Value)
import RemoteData exposing (RemoteData)
import Utils exposing (hasWhitespaces)



-- M O D E L


type alias Model =
    { interlocutor : String
    , call : RemoteData String ()
    }


initial : Model
initial =
    { interlocutor = ""
    , call = RemoteData.NotAsked
    }



-- U P D A T E


type Msg
    = ChangeInterlocutor String
    | Call


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ChangeInterlocutor nextInterlocutor ->
            ( { model | interlocutor = nextInterlocutor }
            , Cmd.none
            )

        Call ->
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
                , Cmd.none
                )



-- V I E W


viewWebRtcRemote :
    { userAgent : Value
    , server : String
    , username : String
    , withAudio : Bool
    , withVideo : Bool
    }
    -> Html Msg
viewWebRtcRemote options =
    Html.node "web-rtc-remote-view"
        [ Html.Attributes.property "user_agent" options.userAgent
        , Html.Attributes.property "uri" (Encode.string ("sip:" ++ options.username ++ "@" ++ options.server))
        , Html.Attributes.property "with_audio" (Encode.bool options.withAudio)
        , Html.Attributes.property "with_video" (Encode.bool options.withVideo)
        ]
        []


view : Credentials -> Model -> Html Msg
view credentials model =
    let
        ( busy, error ) =
            case model.call of
                RemoteData.Loading ->
                    ( True, Nothing )

                RemoteData.Failure reason ->
                    ( False, Just reason )

                _ ->
                    ( False, Nothing )
    in
    div
        []
        [ h1 [] [ text "Dashboard" ]
        , p []
            [ text "Hey "
            , i [] [ text credentials.username ]
            ]

        --
        , form
            [ Html.Events.onSubmit Call
            ]
            [ button
                [ Html.Attributes.type_ "submit"
                , Html.Attributes.disabled busy
                , Html.Attributes.tabindex 0
                ]
                [ text "Call to "
                ]
            , input
                [ Html.Attributes.type_ "text"
                , Html.Attributes.placeholder "Interlocutor"
                , Html.Attributes.value model.interlocutor
                , Html.Attributes.readonly busy
                , Html.Attributes.tabindex 0
                , Html.Attributes.autofocus True
                , Html.Events.onInput ChangeInterlocutor
                ]
                []
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

        --
        , case model.call of
            RemoteData.NotAsked ->
                text ""

            RemoteData.Failure _ ->
                text ""

            _ ->
                viewWebRtcRemote
                    { userAgent = credentials.userAgent
                    , server = "127.0.0.1"
                    , username = model.interlocutor
                    , withAudio = True
                    , withVideo = True
                    }
        ]

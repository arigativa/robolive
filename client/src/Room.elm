module Room exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Dom
import Credentials exposing (Credentials)
import Html exposing (Html, button, div, form, h1, i, input, p, strong, text, video)
import Html.Attributes
import Html.Events
import JsSIP
import Json.Encode exposing (Value)
import RemoteData exposing (RemoteData)
import Task
import Utils exposing (hasWhitespaces)


interlocutorInputID : String
interlocutorInputID =
    "__interlocutor_input__"



-- M O D E L


type alias Model =
    { interlocutor : String
    , call : RemoteData String Value
    }


initial : ( Model, Cmd Msg )
initial =
    ( { interlocutor = ""
      , call = RemoteData.NotAsked
      }
    , Task.attempt (always NoOp) (Browser.Dom.focus interlocutorInputID)
    )



-- U P D A T E


type Msg
    = NoOp
    | ChangeInterlocutor String
    | Call Value
    | CallDone (Result String Value)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

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
                    }
                )

        CallDone result ->
            ( { model | call = RemoteData.fromResult result }
            , Cmd.none
            )



-- S U B S C R I P T I O N S


subscriptions : Sub Msg
subscriptions =
    JsSIP.onCalled CallDone



-- V I E W


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
        [ h1 [] [ text "Room" ]
        , p []
            [ text "Hey "
            , i [] [ text credentials.username ]
            ]

        --
        , form
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
            RemoteData.Success stream ->
                video
                    [ Html.Attributes.autoplay True
                    , Html.Attributes.property "srcObject" stream
                    ]
                    []

            _ ->
                text ""
        ]

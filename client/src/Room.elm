module Room exposing (Model, Msg, initial, subscriptions, update, view)

import AVL.Dict as Dict exposing (Dict)
import Browser.Dom
import Credentials exposing (Credentials)
import Debounce exposing (Debounce)
import Html exposing (Html, b, button, div, form, h1, h3, input, p, strong, text, video)
import Html.Attributes
import Html.Events
import Html.Lazy
import JsSIP
import Json.Encode as Encode
import List.Extra
import RemoteData exposing (RemoteData)
import Room.IceServer as IceServer
import Slider
import Task
import Utils exposing (hasWhitespaces)


interlocutorInputID : String
interlocutorInputID =
    "__interlocutor_input__"



-- M O D E L


type alias Connection =
    { stream : JsSIP.MediaStream
    , sliders : Dict Int (Slider.Model Int)
    , debounces : Dict Int (Debounce Int)
    }


type alias Model =
    { iceServers : List IceServer.Model
    , interlocutor : String
    , call : RemoteData String Connection
    }


initial : ( Model, Cmd Msg )
initial =
    ( { iceServers = [
            { active = False, url = "turn:rl.arigativa.ru:8080?transport=udp", username = "turn", password = "turn" }
            , { active = False, url = "turn:rl.arigativa.ru:8080?transport=tcp", username = "turn", password = "turn" }
        ]
      , interlocutor = "robomachine"
      , call = RemoteData.NotAsked
      }
    , Task.attempt (always NoOp) (Browser.Dom.focus interlocutorInputID)
    )


initialDebounce : Debounce Int
initialDebounce =
    Debounce.init 300


getDebounce : Int -> Dict Int (Debounce Int) -> Debounce Int
getDebounce index debounces =
    Maybe.withDefault initialDebounce (Dict.get index debounces)


initialSlider : Slider.Model Int
initialSlider =
    Slider.int
        { min = 0
        , max = 120
        , step = 1
        , initialValue = 0
        }


getSlider : Int -> Dict Int (Slider.Model Int) -> Slider.Model Int
getSlider index sliders =
    Maybe.withDefault initialSlider (Dict.get index sliders)



-- U P D A T E


type Msg
    = NoOp
    | AddIceServer String
    | ChangeInterlocutor String
    | Call JsSIP.UserAgent
    | CallDone (Result String JsSIP.MediaStream)
    | CallEnd
    | Hangup
    | DebounceTick Int Debounce.Tick
    | IceServerMsg Int IceServer.Msg
    | SliderMsg Int Slider.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

        AddIceServer initialUrl ->
            case IceServer.init initialUrl of
                Nothing ->
                    ( model, Cmd.none )

                Just lastIceServer ->
                    ( { model | iceServers = model.iceServers ++ [ lastIceServer ] }
                    , Cmd.map (always NoOp) IceServer.focusLast
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
                    , iceServers = List.filterMap IceServer.toJsSIP model.iceServers
                    }
                )

        CallDone (Err err) ->
            ( { model | call = RemoteData.Failure err }
            , Cmd.none
            )

        CallDone (Ok stream) ->
            let
                initialConnection =
                    { stream = stream
                    , sliders = Dict.empty
                    , debounces = Dict.empty
                    }
            in
            ( { model | call = RemoteData.Success initialConnection }
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

        IceServerMsg index msgOfIceServer ->
            ( case Maybe.map (IceServer.update msgOfIceServer) (List.Extra.getAt index model.iceServers) of
                Nothing ->
                    model

                Just IceServer.Deleted ->
                    { model | iceServers = List.Extra.removeAt index model.iceServers }

                Just (IceServer.Updated nextIceServer) ->
                    { model | iceServers = List.Extra.setAt index nextIceServer model.iceServers }
            , Cmd.none
            )

        DebounceTick index tick ->
            case model.call of
                RemoteData.Success connection ->
                    case Debounce.getValue tick (getDebounce index connection.debounces) of
                        Nothing ->
                            ( model, Cmd.none )

                        Just value ->
                            ( model
                            , Encode.object
                                [ ( "index", Encode.int index )
                                , ( "angle", Encode.int value )
                                ]
                                |> JsSIP.sendInfo
                            )

                _ ->
                    ( model, Cmd.none )

        SliderMsg index msgOfSlider ->
            case model.call of
                RemoteData.Success connection ->
                    let
                        nextSlider =
                            Slider.update msgOfSlider (getSlider index connection.sliders)

                        debounce =
                            getDebounce index connection.debounces

                        ( nextDebounce, cmdOfDebounce ) =
                            case Slider.getValue nextSlider of
                                Nothing ->
                                    ( debounce, Cmd.none )

                                Just value ->
                                    Debounce.push value debounce

                        nextConnection =
                            { connection
                                | sliders = Dict.insert index nextSlider connection.sliders
                                , debounces = Dict.insert index nextDebounce connection.debounces
                            }
                    in
                    ( { model | call = RemoteData.Success nextConnection }
                    , Cmd.map (DebounceTick index) cmdOfDebounce
                    )

                _ ->
                    ( model, Cmd.none )



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
            , Html.Attributes.value ""
            , Html.Attributes.disabled disabled
            , Html.Attributes.size 50
            , Html.Events.onInput AddIceServer
            ]
            []
        ]


viewIceServers : Bool -> List IceServer.Model -> Html Msg
viewIceServers disabled iceServers =
    let
        lastIndex =
            List.length iceServers - 1
    in
    List.indexedMap
        (\index iceServer ->
            viewIceServerContainer
                [ Html.map
                    (IceServerMsg index)
                    (Html.Lazy.lazy3 IceServer.view (index == lastIndex) disabled iceServer)
                ]
        )
        iceServers
        ++ [ viewIceServerCreator disabled ]
        |> div
            [ Html.Attributes.style "margin-bottom" "15px"
            ]


viewCallForm : Credentials -> Bool -> Maybe String -> List IceServer.Model -> String -> Html Msg
viewCallForm credentials busy error iceServers interlocutor =
    form
        [ Html.Attributes.novalidate True
        , Html.Events.onSubmit (Call credentials.userAgent)
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

            RemoteData.Success { stream, sliders } ->
                div []
                    [ p []
                        [ text "On call with "
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
                    , List.range 0 5
                        |> List.map
                            (\index ->
                                sliders
                                    |> getSlider index
                                    |> Slider.view
                                    |> Html.map (SliderMsg index)
                            )
                        |> div []
                    ]
        ]

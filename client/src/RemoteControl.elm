module RemoteControl exposing (Model, Msg, initial, subscriptions, update, view)

import Browser.Events
import Html exposing (Html, br, button, div, span, text)
import Html.Attributes exposing (style)
import Html.Events
import JsSIP
import Json.Decode as Decode
import Json.Encode as Encode exposing (Value)
import Set exposing (Set)


encodeKeyCode : Int -> Value
encodeKeyCode keyCode =
    [ ( "keyCode", Encode.int keyCode )
    ]
        |> Encode.object


arrowLeft : Int
arrowLeft =
    37


arrowUp : Int
arrowUp =
    38


arrowRight : Int
arrowRight =
    39


arrowDown : Int
arrowDown =
    40


keyCodeWhiteList : Set Int
keyCodeWhiteList =
    Set.fromList [ arrowLeft, arrowUp, arrowRight, arrowDown ]



-- M O D E L


type alias Model =
    Maybe Int


initial : Model
initial =
    Nothing



-- U P D A T E


type Msg
    = KeyDown Int
    | KeyUp


update : Msg -> ( Model, Cmd Msg )
update msg =
    case msg of
        KeyDown keyCode ->
            if Set.member keyCode keyCodeWhiteList then
                ( Just keyCode
                , JsSIP.sendInfo (encodeKeyCode keyCode)
                )

            else
                ( Nothing, Cmd.none )

        KeyUp ->
            ( Nothing, Cmd.none )



-- S U B S C R I P T I O N S


subscriptions : Model -> Sub Msg
subscriptions model =
    if model == Nothing then
        Browser.Events.onKeyDown (Decode.map KeyDown Html.Events.keyCode)

    else
        Browser.Events.onKeyUp (Decode.succeed KeyUp)



-- V I E W


viewSpace : Html msg
viewSpace =
    span
        [ style "display" "inline-block"
        , style "width" "68px"
        ]
        []


viewKey : Maybe Int -> Int -> String -> Html Msg
viewKey pressedKey keyCode label =
    button
        [ style "display" "inline-block"
        , style "margin" "4px 0 0 4px"
        , style "border" "1px solid #bbb"
        , style "width" "64px"
        , style "height" "64px"
        , style "font-size" "32px"
        , style "color" "#444"
        , style "outline" "none"
        , style "cursor" "pointer"
        , if pressedKey == Just keyCode then
            style "background" "#ccc"

          else
            style "background" "#eee"
        , Html.Events.onMouseDown (KeyDown keyCode)
        , Html.Events.onMouseUp KeyUp
        ]
        [ text label
        ]


view : Model -> Html Msg
view model =
    div []
        [ viewSpace
        , viewKey model arrowUp "↑"
        , br [] []
        , viewKey model arrowLeft "←"
        , viewKey model arrowDown "↓"
        , viewKey model arrowRight "→"
        ]

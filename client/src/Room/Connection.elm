module Room.Connection exposing (Model, Msg, init, update, view)

import AVL.Dict as Dict exposing (Dict)
import Html exposing (Html, div, video)
import Html.Attributes
import Html.Keyed
import Html.Lazy
import JsSIP
import Json.Encode as Encode
import Slider
import Throttle exposing (Throttle)



-- M O D E L


type alias Model =
    { stream : JsSIP.MediaStream
    , sliders : Dict Int (Throttle (Slider.Model Int))
    }


init : JsSIP.MediaStream -> Model
init stream =
    { stream = stream
    , sliders = Dict.empty
    }


initialThrottledSlider : Throttle (Slider.Model Int)
initialThrottledSlider =
    Slider.int
        { min = 0
        , max = 120
        , step = 1
        , initialValue = 0
        }
        |> Throttle.init 300


getSlider : Int -> Dict Int (Throttle (Slider.Model Int)) -> Throttle (Slider.Model Int)
getSlider index sliders =
    Maybe.withDefault initialThrottledSlider (Dict.get index sliders)



-- U P D A T E


type Msg
    = ThrottleTick Int Throttle.Tick
    | SliderMsg Int Slider.Msg


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ThrottleTick index tick ->
            let
                nextThrottledSlider =
                    Throttle.tick tick (getSlider index model.sliders)
            in
            ( { model | sliders = Dict.insert index nextThrottledSlider model.sliders }
            , case Slider.getValue (Throttle.getValue nextThrottledSlider) of
                Nothing ->
                    Cmd.none

                Just value ->
                    Encode.object
                        [ ( "index", Encode.int index )
                        , ( "angle", Encode.int value )
                        ]
                        |> JsSIP.sendInfo
            )

        SliderMsg index msgOfSlider ->
            let
                ( nextThrottledSlider, cmdOfThrottle ) =
                    Throttle.update
                        (Slider.update msgOfSlider)
                        (getSlider index model.sliders)
            in
            ( { model | sliders = Dict.insert index nextThrottledSlider model.sliders }
            , Cmd.map (ThrottleTick index) cmdOfThrottle
            )



-- V I E W


viewVideoStream : JsSIP.MediaStream -> Html msg
viewVideoStream stream =
    video
        [ Html.Attributes.autoplay True
        , JsSIP.srcObject stream
        ]
        []


viewSlider : Model -> Html Msg
viewSlider model =
    div []
        [ Html.Lazy.lazy viewVideoStream model.stream
        , List.range 0 5
            |> List.map
                (\index ->
                    ( String.fromInt index
                    , model.sliders
                        |> getSlider index
                        |> Throttle.getValue
                        |> Slider.view
                        |> Html.map (SliderMsg index)
                    )
                )
            |> Html.Keyed.node "div" []
        ]


view : Model -> Html Msg
view =
    Html.Lazy.lazy viewSlider

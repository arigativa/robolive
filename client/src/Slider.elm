module Slider exposing (Model, Msg, float, getValue, int, update, view)

import Html exposing (Html, div, input, span, text)
import Html.Attributes
import Html.Events



-- M O D E L


type alias Model a =
    { serialize : a -> String
    , deserialize : String -> Maybe a
    , min : a
    , max : a
    , step : a
    , value : String
    }


int :
    { min : Int
    , max : Int
    , step : Int
    , initialValue : Int
    }
    -> Model Int
int { min, max, step, initialValue } =
    Model String.fromInt String.toInt min max step (String.fromInt initialValue)


float :
    { min : Float
    , max : Float
    , step : Float
    , initialValue : Float
    }
    -> Model Float
float { min, max, step, initialValue } =
    Model String.fromFloat String.toFloat min max step (String.fromFloat initialValue)


getValue : Model a -> Maybe a
getValue model =
    model.deserialize model.value



-- U P D A T E


type Msg
    = Change String


update : Msg -> Model a -> Model a
update (Change nextValue) model =
    { model | value = nextValue }



-- V I E W


viewBorderValue : String -> Html msg
viewBorderValue value =
    span
        [ Html.Attributes.style "font-size" "0.8em"
        ]
        [ text value
        ]


view : Model a -> Html Msg
view model =
    let
        ( min, max, step ) =
            ( model.serialize model.min
            , model.serialize model.max
            , model.serialize model.step
            )
    in
    div
        [ Html.Attributes.style "display" "flex"
        , Html.Attributes.style "flex-flow" "row nowrap"
        , Html.Attributes.style "align-items" "center"
        ]
        [ viewBorderValue min
        , input
            [ Html.Attributes.type_ "range"
            , Html.Attributes.min min
            , Html.Attributes.max max
            , Html.Attributes.step step
            , Html.Attributes.value model.value
            , Html.Events.onInput Change
            ]
            []
        , viewBorderValue max
        , input
            [ Html.Attributes.style "text-align" "right"
            , Html.Attributes.style "margin-left" "5px"

            --
            , Html.Attributes.type_ "number"
            , Html.Attributes.min min
            , Html.Attributes.max max
            , Html.Attributes.step step
            , Html.Attributes.value model.value
            , Html.Events.onInput Change
            ]
            []
        ]

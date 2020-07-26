module Slider exposing (Model, Msg, float, getValue, int, subscriptions, update, view)

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
    , value : Int
    }
    -> Model Int
int { min, max, step, value } =
    Model String.fromInt String.toInt min max step (String.fromInt value)


float :
    { min : Float
    , max : Float
    , step : Float
    , value : Float
    }
    -> Model Float
float { min, max, step, value } =
    Model String.fromFloat String.toFloat min max step (String.fromFloat value)


getValue : Model a -> Maybe a
getValue model =
    model.deserialize model.value



-- U P D A T E


type Msg
    = Change String


update : Msg -> Model a -> ( Model a, Cmd Msg )
update msg model =
    ( model, Cmd.none )



-- S U B S C R I P T I O N S


subscriptions : Model a -> Sub Msg
subscriptions model =
    Sub.none



-- V I E W


view : Model a -> Html Msg
view model =
    let
        ( min, max, step ) =
            ( model.serialize model.min
            , model.serialize model.max
            , model.serialize model.step
            )
    in
    div []
        [ input
            [ Html.Attributes.type_ "number"
            , Html.Attributes.min min
            , Html.Attributes.max max
            , Html.Attributes.step step
            , Html.Attributes.value model.value
            ]
            []
        , span [] [ text min ]
        , input
            [ Html.Attributes.type_ "range"
            ]
            []
        ]

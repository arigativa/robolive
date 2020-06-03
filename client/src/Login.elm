module Login exposing (Model, Msg, initial, update, view)

import Html exposing (Html, button, form, input, text)
import Html.Attributes
import Html.Events
import JsSIP
import RemoteData exposing (RemoteData)



-- M O D E L


type alias Model =
    { name : String
    , signingIn : RemoteData String Never
    }


initial : Model
initial =
    { name = ""
    , signingIn = RemoteData.NotAsked
    }



-- U P D A T E


type Msg
    = ChangeName String
    | SignIn


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ChangeName nextName ->
            ( { model | name = nextName }
            , Cmd.none
            )

        SignIn ->
            ( { model | signingIn = RemoteData.Loading }
            , JsSIP.createPhoneInstance
                { protocol = JsSIP.WebSocket
                , server = "127.0.0.1"
                , port_ = Just 4443
                , register = True
                , username = model.name
                , password = Nothing
                }
            )



-- V I E W


view : Model -> Html Msg
view model =
    let
        busy =
            RemoteData.isLoading model.signingIn
    in
    form
        [ Html.Events.onSubmit SignIn
        ]
        [ input
            [ Html.Attributes.type_ "text"
            , Html.Attributes.placeholder "Your Name"
            , Html.Attributes.value model.name
            , Html.Attributes.readonly busy
            , Html.Attributes.tabindex 0
            , Html.Attributes.autofocus True
            , Html.Events.onInput ChangeName
            ]
            []
        , button
            [ Html.Attributes.type_ "button"
            , Html.Attributes.disabled (busy || String.isEmpty (String.trim model.name))
            , Html.Attributes.tabindex 0
            ]
            [ text "Sign In"
            ]
        ]

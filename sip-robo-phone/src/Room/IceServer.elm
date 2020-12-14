module Room.IceServer exposing (Model, Msg, Stage(..), focusLast, init, toJsSIP, update, view)

import Browser.Dom
import Html exposing (Html, div, input, label, text)
import Html.Attributes
import Html.Events
import JsSIP
import Task


isTurnServer : String -> Bool
isTurnServer url =
    String.startsWith "turn:" url || String.startsWith "turns:" url


lastIceServerID : String
lastIceServerID =
    "__ice_server_last__"



-- M O D E L


type alias Model =
    { active : Bool
    , url : String
    , username : String
    , password : String
    }


init : String -> Maybe Model
init url =
    let
        trimmed =
            String.trim url
    in
    if String.isEmpty trimmed then
        Nothing

    else
        Just (Model True trimmed "" "")


focusLast : Cmd ()
focusLast =
    Task.attempt (always ()) (Browser.Dom.focus lastIceServerID)


toJsSIP : Model -> Maybe JsSIP.IceServer
toJsSIP { active, url, username, password } =
    if not active || String.isEmpty url then
        Nothing

    else if isTurnServer url then
        Just
            { url = url
            , username = Just username
            , password = Just password
            }

    else
        Just
            { url = url
            , username = Nothing
            , password = Nothing
            }


type Msg
    = ChangeUrl String
    | ChangeUsername String
    | ChangePassword String
    | Activate Bool
    | LostFocus String


type Stage
    = Updated Model
    | Deleted


update : Msg -> Model -> Stage
update msg model =
    case msg of
        ChangeUrl nextUrl ->
            Updated { model | url = String.trim nextUrl }

        ChangeUsername nextUsername ->
            Updated { model | username = String.trim nextUsername }

        ChangePassword nextPassword ->
            Updated { model | password = nextPassword }

        Activate active ->
            Updated { model | active = active }

        LostFocus "" ->
            Deleted

        LostFocus _ ->
            Updated model



-- V I E W


view : Bool -> Bool -> Model -> Html Msg
view asFirst disabled { active, url, username, password } =
    let
        hasCredentials =
            isTurnServer url
    in
    div
        []
        [ input
            [ if asFirst then
                Html.Attributes.id lastIceServerID

              else
                Html.Attributes.style "" ""
            , Html.Attributes.type_ "text"
            , Html.Attributes.tabindex 0
            , Html.Attributes.value url
            , Html.Attributes.readonly (disabled || not active)
            , Html.Attributes.size 50
            , Html.Events.onInput ChangeUrl
            , Html.Events.onBlur (LostFocus url)
            ]
            []

        --
        , if hasCredentials then
            input
                [ Html.Attributes.type_ "email"
                , Html.Attributes.tabindex 0
                , Html.Attributes.value username
                , Html.Attributes.placeholder "username"
                , Html.Attributes.readonly (disabled || not active)
                , Html.Events.onInput ChangeUsername
                ]
                []

          else
            text ""

        --
        , if hasCredentials then
            input
                [ Html.Attributes.type_ "password"
                , Html.Attributes.tabindex 0
                , Html.Attributes.value password
                , Html.Attributes.placeholder "password"
                , Html.Attributes.readonly (disabled || not active)
                , Html.Events.onInput ChangePassword
                ]
                []

          else
            text ""

        --
        , label
            []
            [ input
                [ Html.Attributes.type_ "checkbox"
                , Html.Attributes.tabindex 0
                , Html.Attributes.checked active
                , Html.Attributes.disabled disabled
                , Html.Events.onCheck Activate
                ]
                []
            , if active then
                text "use"

              else
                text "ignore"
            ]
        ]

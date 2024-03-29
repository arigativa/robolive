port module JsSIP exposing
    ( IceServer
    , MediaStream
    , Protocol(..)
    , UserAgent
    , call
    , hangup
    , mockMediaStream
    , mockUserAgent
    , onCalled
    , onEnd
    , onRegistred
    , register
    , sendInfo
    , srcObject
    )

import Html
import Html.Attributes
import Json.Encode as Encode exposing (Value, encode)


type UserAgent
    = UserAgent Value


mockUserAgent : UserAgent
mockUserAgent =
    UserAgent Encode.null


unwrapUserAgent : UserAgent -> Value
unwrapUserAgent (UserAgent ua) =
    ua


type MediaStream
    = MediaStream Value


mockMediaStream : MediaStream
mockMediaStream =
    MediaStream Encode.null


srcObject : MediaStream -> Html.Attribute msg
srcObject (MediaStream stream) =
    Html.Attributes.property "srcObject" stream


generateUri : String -> String -> String
generateUri username server =
    "sip:" ++ username ++ "@" ++ server


type Protocol
    = WebSocket
    | WebSocketSecure


protocolToString : Protocol -> String
protocolToString protocol =
    case protocol of
        WebSocket ->
            "ws"

        WebSocketSecure ->
            "wss"


port js_sip__register :
    { web_socket_url : String
    , uri : String
    , register : Bool
    , username : String
    , password : Maybe String
    }
    -> Cmd msg


register :
    { protocol : Protocol
    , server : String
    , port_ : Maybe Int
    , register : Bool
    , username : String
    , password : Maybe String
    }
    -> Cmd msg
register options =
    { web_socket_url =
        String.concat
            [ protocolToString options.protocol
            , "://"
            , options.server
            , options.port_
                |> Maybe.map ((++) ":" << String.fromInt)
                |> Maybe.withDefault ""
            ]
    , uri = generateUri options.username options.server
    , register = options.register
    , username = options.username
    , password = options.password
    }
        |> js_sip__register


port js_sip__on_registred_err : (String -> msg) -> Sub msg


port js_sip__on_registred_ok : (Value -> msg) -> Sub msg


onRegistred : (Result String UserAgent -> msg) -> Sub msg
onRegistred tagger =
    Sub.batch
        [ js_sip__on_registred_err (tagger << Err)
        , js_sip__on_registred_ok (tagger << Ok << UserAgent)
        ]


type alias IceServer =
    { url : String
    , username : Maybe String
    , password : Maybe String
    }


port js_sip__call :
    { user_agent : Value
    , uri : String
    , with_audio : Bool
    , with_video : Bool
    , ice_servers : List IceServer
    }
    -> Cmd msg


call :
    { userAgent : UserAgent
    , server : String
    , username : String
    , withAudio : Bool
    , withVideo : Bool
    , iceServers : List IceServer
    }
    -> Cmd msg
call options =
    js_sip__call
        { user_agent = unwrapUserAgent options.userAgent
        , uri = generateUri options.username options.server
        , with_audio = options.withAudio
        , with_video = options.withVideo
        , ice_servers = options.iceServers
        }


port js_sip__on_call_failed : (String -> msg) -> Sub msg


port js_sip__on_call_confirmed : (Value -> msg) -> Sub msg


onCalled : (Result String MediaStream -> msg) -> Sub msg
onCalled tagger =
    Sub.batch
        [ js_sip__on_call_failed (tagger << Err)
        , js_sip__on_call_confirmed (tagger << Ok << MediaStream)
        ]


port js_sip__send_info : String -> Cmd msg


sendInfo : Value -> Cmd msg
sendInfo value =
    js_sip__send_info (encode 0 value)


port js_sip__hangup : () -> Cmd msg


hangup : Cmd msg
hangup =
    js_sip__hangup ()


port js_sip__on_end : (() -> msg) -> Sub msg


onEnd : msg -> Sub msg
onEnd msg =
    js_sip__on_end (always msg)

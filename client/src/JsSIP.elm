port module JsSIP exposing
    ( Protocol(..)
    , RegistrationError
    , call
    , onCalled
    , onRegistred
    , register
    )

import Json.Encode exposing (Value)


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


type alias RegistrationError =
    { code : Int
    , reason : String
    }


port js_sip__on_registred_err : (RegistrationError -> msg) -> Sub msg


port js_sip__on_registred_ok : (Value -> msg) -> Sub msg


onRegistred : (Result RegistrationError Value -> msg) -> Sub msg
onRegistred tagger =
    Sub.batch
        [ js_sip__on_registred_err (tagger << Err)
        , js_sip__on_registred_ok (tagger << Ok)
        ]


port js_sip__call :
    { user_agent : Value
    , uri : String
    , with_audio : Bool
    , with_video : Bool
    }
    -> Cmd msg


call :
    { userAgent : Value
    , server : String
    , username : String
    , withAudio : Bool
    , withVideo : Bool
    }
    -> Cmd msg
call options =
    js_sip__call
        { user_agent = options.userAgent
        , uri = generateUri options.username options.server
        , with_audio = options.withAudio
        , with_video = options.withVideo
        }


port js_sip__on_call_failed : (String -> msg) -> Sub msg


port js_sip__on_call_confirmed : (Value -> msg) -> Sub msg


onCalled : (Result String Value -> msg) -> Sub msg
onCalled tagger =
    Sub.batch
        [ js_sip__on_call_failed (tagger << Err)
        , js_sip__on_call_confirmed (tagger << Ok)
        ]

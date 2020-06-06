port module JsSIP exposing
    ( Protocol(..)
    , RegistrationError
    , onRegistred
    , register
    )


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
    , uri = "sip:" ++ options.username ++ "@" ++ options.server
    , register = options.register
    , username = options.username
    , password = options.password
    }
        |> js_sip__register


port js_sip__on_registred_ok : (() -> msg) -> Sub msg


type alias RegistrationError =
    { code : Int
    , reason : String
    }


port js_sip__on_registred_err : (RegistrationError -> msg) -> Sub msg


onRegistred : (Result RegistrationError () -> msg) -> Sub msg
onRegistred tagger =
    Sub.batch
        [ js_sip__on_registred_ok (\_ -> tagger (Ok ()))
        , js_sip__on_registred_err (tagger << Err)
        ]

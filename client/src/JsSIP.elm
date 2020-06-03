port module JsSIP exposing (Protocol(..), createPhoneInstance)


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


port js_sip__create_phone_instance :
    { web_socket_url : String
    , uri : String
    , register : Bool
    , username : String
    , password : Maybe String
    }
    -> Cmd msg


createPhoneInstance :
    { protocol : Protocol
    , server : String
    , port_ : Maybe Int
    , register : Bool
    , username : String
    , password : Maybe String
    }
    -> Cmd msg
createPhoneInstance options =
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
        |> js_sip__create_phone_instance

module Stories.Room exposing (stories)

import AVL.Dict as Dict
import Bulletproof exposing (Story)
import Bulletproof.Knob
import Credentials exposing (Credentials)
import JsSIP
import RemoteData
import Room
import Room.IceServer as IceServer
import Utils exposing (ifelse)


initial : Room.Model
initial =
    Tuple.first Room.initial


credentials : Credentials
credentials =
    Credentials "currentUser" JsSIP.mockUserAgent


initIceServers : String -> List IceServer.Model
initIceServers =
    List.filterMap IceServer.init << String.split " "


stories : List Story
stories =
    [ Bulletproof.story "Initial"
        (initial
            |> Room.view credentials
            |> Bulletproof.fromHtml
        )

    --
    , Bulletproof.story "Inputs are filled"
        (\interlocutor servers ->
            { initial
                | interlocutor = interlocutor
                , iceServers = initIceServers servers
            }
                |> Room.view credentials
                |> Bulletproof.fromHtml
        )
        |> Bulletproof.Knob.string "Interlocutor" "username"
        |> Bulletproof.Knob.string "Ice Servers" "turns:127.0.0.1 stun:127.0.0.2"

    --
    , Bulletproof.story "Loading"
        (\loading ->
            { initial
                | interlocutor = "username"
                , iceServers = initIceServers "turns:127.0.0.1 stun:127.0.0.2"
                , call = ifelse loading RemoteData.Loading RemoteData.NotAsked
            }
                |> Room.view credentials
                |> Bulletproof.fromHtml
        )
        |> Bulletproof.Knob.bool "Busy" True

    --
    , Bulletproof.story "Failure"
        (\reason ->
            { initial
                | interlocutor = "username"
                , iceServers = initIceServers "turns:127.0.0.1 stun:127.0.0.2"
                , call = RemoteData.Failure reason
            }
                |> Room.view credentials
                |> Bulletproof.fromHtml
        )
        |> Bulletproof.Knob.string "Reason" "Oops something went wrong"

    --
    , Bulletproof.story "Connected"
        ({ initial
            | interlocutor = "username"
            , iceServers = initIceServers "turns:127.0.0.1 stun:127.0.0.2"
            , call =
                RemoteData.Success
                    { stream = JsSIP.mockMediaStream
                    , sliders = Dict.empty
                    , debounces = Dict.empty
                    }
         }
            |> Room.view credentials
            |> Bulletproof.fromHtml
        )
    ]

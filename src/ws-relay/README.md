Protocol
--------

First message: `JOIN roomIdentifier` where `roomIdentifier` is any string (let's use UUID)

No confirmation is sent after `JOIN` command (TODO - change this?)

Every other message is broadcast to every client connected to joined room.
Every incoming message is sent by someone from the room.
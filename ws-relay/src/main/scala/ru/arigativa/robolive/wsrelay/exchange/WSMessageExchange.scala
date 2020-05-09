package ru.arigativa.robolive.wsrelay.exchange

import cats.effect.Concurrent
import fs2.{Pipe, Pull, Stream}
import io.chrisdavenport.log4cats.Logger
import org.http4s.websocket.WebSocketFrame
import org.http4s.websocket.WebSocketFrame.Text
import ru.arigativa.robolive.wsrelay.wsprotocol.MessageProtocol

object WSMessageExchange {

  private def trimTextFrame(frame: WebSocketFrame): WebSocketFrame = {
    frame match {
      case WebSocketFrame.Text(txt, isLast) => WebSocketFrame.Text(txt.trim, isLast)
      case _ => frame
    }
  }

  private def pullEntireStream[F[_], T](stream: Stream[F, T]): Pull[F, T, Unit] = {
    stream.pull.uncons.flatMap {
      case Some((head, tail)) => Pull.output(head) >> pullEntireStream(tail)
      case None => Pull.done
    }
  }

  type RoomId = String

  def websocketHandler[F[_] : Concurrent : Logger, Message : MessageProtocol](
    exchange: MessageExchange[F, RoomId, Message]
  ): Pipe[F, WebSocketFrame, WebSocketFrame] = {
    val log = Logger[F]
    val MessageMatcher = (MessageProtocol[Message].decode _).unlift

    def handleIncomingStream(incoming: Stream[F, WebSocketFrame]): Pull[F, WebSocketFrame, Unit] = {
      incoming
        .evalTap(frame => log.trace(s"received frame: $frame"))
        .map(trimTextFrame)
        .pull.uncons1
        .flatMap {
          case Some((Text(s"JOIN $roomId", _), restStream)) =>
            Pull.eval(log.debug(s"joined $roomId")) >>
              pullEntireStream {
                Stream.resource(exchange.join(roomId))
                  .flatMap { room =>
                    val sendIncomingToRoom =
                      restStream
                        .evalMap {
                          case MessageMatcher(message) => room.send(message)
                          case unexpected => log.warn(s"unexpected message in room $roomId: $unexpected")
                        }
                        .drain

                    val encodedRoomMessages = room.inbox.map(MessageProtocol[Message].encode)

                    encodedRoomMessages.concurrently(sendIncomingToRoom)
                  }
              }
          case Some((frame, restStream)) =>
            Pull.eval(log.warn(s"unexpected frame: $frame")) >>
              handleIncomingStream(restStream)
          case None =>
            Pull.eval(log.debug("end of stream")) >>
              Pull.done
        }
    }

    (handleIncomingStream _).andThen(_.stream)
  }
}

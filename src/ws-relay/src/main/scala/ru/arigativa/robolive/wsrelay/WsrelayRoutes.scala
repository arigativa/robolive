package ru.arigativa.robolive.wsrelay

import cats.Applicative
import cats.effect.concurrent.Deferred
import cats.effect.{Concurrent, Sync}
import cats.implicits._
import fs2.{Pipe, Pull, Stream}
import fs2.concurrent.Queue
import org.http4s.HttpRoutes
import org.http4s.dsl.Http4sDsl
import org.http4s.server.websocket.WebSocketBuilder
import org.http4s.websocket.WebSocketFrame
import ru.arigativa.robolive.wsrelay.exchange.MessageExchange

import scala.util.Random

object WsrelayRoutes {

  type RoomId = Int
  type Message = String

  object RoomId {
    def unapply(arg: String): Option[RoomId] = arg.toIntOption
  }
  object Message {
    def unapply(arg: String): Option[Message] = Some(arg)
  }

  def encodeMessage(m: Message): WebSocketFrame = WebSocketFrame.Text(m)

  implicit class AnyOptionOps[T](val value: T) extends AnyVal {
    def somePure[F[_] : Applicative]: F[Option[T]] = Applicative[F].pure(Some(value))
  }


  def pullEntireStream[F[_], T](stream: Stream[F, T]): Pull[F, T, Unit] = {
    stream.pull.uncons.flatMap {
      case Some((head, tail)) => Pull.output(head) >> pullEntireStream(tail)
      case None => Pull.done
    }
  }


  def relayRoute[F[_] : Sync : Concurrent](exchange: MessageExchange[F, RoomId, Message])
                                          (implicit Http4sDsl: Http4sDsl[F]) = {
    import Http4sDsl._
    import WebSocketFrame.Text

    HttpRoutes.of[F] {
      case GET -> Root =>

        for {
          roomMessagesStreamPromise <- Deferred[F, Stream[F, Message]]
        } yield {

          type RoomInbox = Message => F[Unit]

          val xx: Pipe[F, WebSocketFrame, WebSocketFrame] =
            (incoming: Stream[F, WebSocketFrame]) => {
              incoming.pull.uncons1
                .flatMap {
                  case Some((Text(s"JOIN ${RoomId(roomId)}", _), restStream)) =>
                    pullEntireStream {
                      Stream.resource(exchange.join(roomId))
                        .flatMap { room =>
                          room.inbox.map(encodeMessage)
                              .concurrently {
                                restStream
                                  .evalMap {
                                    case Text(Message(msg), _) => room.send(msg)
                                  }
                                  .drain
                              }
                        }
                    }
                }
                .stream
            }


          val handleIncoming: Pipe[F, WebSocketFrame, Unit] =
            (incoming: Stream[F, WebSocketFrame]) => {
              incoming
                .evalMapAccumulate()

              incoming
                .evalScan[F, Option[RoomInbox]](None) { // is initialization complete?
                  case (None, ) =>

                    exchange.join(roomId)
                      .eva

                      .flatMap {
                        case exchange.Membership(roomMessagesStream, sendToRoom) =>
                          roomMessagesStreamPromise.complete(roomMessagesStream) *> sendToRoom.somePure
                      }
                  case (None, _) =>
                    // invalid state, ignore and go for next
                   (None: Option[RoomInbox]).pure
                  case (Some(sendToRoom), ) =>
                    sendToRoom(msg) *> sendToRoom.somePure
                }
                .drain
            }

          val outgoing = Stream.eval(roomMessagesStreamPromise.get).flatMap(_.map(encodeMessage))

          WebSocketBuilder[F].build(outgoing, handleIncoming)
        }
    }
  }
}
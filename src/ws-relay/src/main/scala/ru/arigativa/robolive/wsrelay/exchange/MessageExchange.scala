package ru.arigativa.robolive.wsrelay.exchange

import fs2.Stream
import cats.effect.{Concurrent, Resource, Sync}
import cats.implicits._

trait MessageExchange[F[_], RoomId, Message] {

  case class Membership(inbox: Stream[F, Message], send: Message => F[Unit])

  def join(roomId: RoomId): Resource[F, Membership]
}

object MessageExchange {

  def inMemory[F[_] : Sync : Concurrent, RoomId, Message]: F[MessageExchange[F, RoomId, Message]] = {
    type MemberId = Long

    for {
      membersInboxes <- MembersInboxes.make[F, Message]
      rooms <- Rooms.make[F, RoomId, MemberId]()
    } yield {
      new MessageExchange[F, RoomId, Message] {
        override def join(roomId: RoomId): Resource[F, Membership] = {
           for {
             (memberId, memberInbox) <- membersInboxes.newInbox
             getNeighbors <- rooms.joinMember(memberId, roomId)
           } yield {
             Membership(
               memberInbox,
               message => {
                 for {
                   recipients <- getNeighbors
                   _ <- recipients.toList.traverse_(membersInboxes.sendMessage(_, message))
                 } yield ()
               },
             )
           }
        }
      }
    }
  }
}
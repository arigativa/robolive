package ru.arigativa.robolive.wsrelay.exchange

import cats.effect.concurrent.Ref
import cats.effect.{Concurrent, Resource}
import cats.implicits._
import fs2.concurrent.Queue
import fs2.Stream


class MembersInboxes[F[_] : Concurrent, MemberId, Message] private (makeNewMemberId: F[MemberId], membersInboxesRef: Ref[F, Map[MemberId, Queue[F, Message]]]) {

  def newInbox: Resource[F, (MemberId, Stream[F, Message])] = {
    def createMemberInbox: F[(MemberId, Stream[F, Message])] =
      for {
        memberId <- makeNewMemberId
        memberInbox <- Queue.unbounded[F, Message]
        _ <- membersInboxesRef.update(_.updated(memberId, memberInbox))
      } yield {
        (memberId, memberInbox.dequeue)
      }
    def forgetMemberInbox(memberId: MemberId): F[Unit] =
      membersInboxesRef.update(_.removed(memberId))

    Resource.make(createMemberInbox) { case (memberId, _) => forgetMemberInbox(memberId) }
  }


  def sendMessage(to: MemberId, message: Message): F[Unit] =
    membersInboxesRef.get.map(_.get(to))
      .flatMap {
        case Some(inbox) => inbox.enqueue1(message)
        case None => ().pure // member is not available anymore
      }
}

object MembersInboxes {
  def make[F[_] : Concurrent, Message]: F[MembersInboxes[F, Long, Message]] =
    for {
      memberCounter <- Ref[F].of(0L)
      membersInboxesRef <- Ref[F].of(Map.empty[Long, Queue[F, Message]])
    } yield {
      new MembersInboxes[F, Long, Message](
        memberCounter.modify(x => (x+1, x+1)),
        membersInboxesRef,
      )
    }
}

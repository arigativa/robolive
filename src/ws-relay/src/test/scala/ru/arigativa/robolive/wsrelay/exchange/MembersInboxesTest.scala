package ru.arigativa.robolive.wsrelay.exchange

import cats.effect.{ContextShift, IO}
import org.scalatest.freespec.AsyncFreeSpec
import org.scalatest.matchers.should.Matchers

import scala.concurrent.ExecutionContext

class MembersInboxesTest extends AsyncFreeSpec with Matchers {

  implicit val ContextShift: ContextShift[IO] = IO.contextShift(implicitly[ExecutionContext])

  "Message sent to via sendMessage is delivered to created inbox" in {
    val testMessage = "Hello, member"
    for {
      inboxes <- MembersInboxes.make[IO, String]
      inboxContent <- inboxes.newInbox.use {
        case (memberId, memberInbox) =>
          for {
            _ <- inboxes.sendMessage(memberId, testMessage)
            inboxContent <- memberInbox.take(1).compile.toList
          } yield inboxContent
      }
    } yield {
      inboxContent shouldBe List(testMessage)
    }
  }.unsafeToFuture()
}

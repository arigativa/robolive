package ru.arigativa.robolive.wsrelay.exchange

import cats.effect.{ContextShift, IO}
import org.scalatest.freespec.AsyncFreeSpec
import org.scalatest.matchers.should.Matchers

import scala.concurrent.ExecutionContext

class MessageExchangeTest extends AsyncFreeSpec with Matchers {

  implicit val ContextShift: ContextShift[IO] = IO.contextShift(implicitly[ExecutionContext])
  type Room = String
  type Message = String

  /*
    All tests are asserting that inbox contain something:
      ```
        member1.inbox.take(1).compile.toList
      ```
    There is two things you have to know:
      * if message is not delivered to inbox, this asserting will just stuck
        probably can be solved with timeout :shrug:
      * it's hard to assert that inbox is empty

    Will look at these things sometime
   */

  "Two members can send messages to each other" in {
    for {
      exchange <- MessageExchange.inMemory[IO, Room, Message]
      _ <- {
        val bedroom = "bedroom"
        val messageFrom2to1 = "Hi, member1"
        val messageFrom1to2 = "Hi, member2"

        exchange.join(bedroom).use { member1 =>
          exchange.join(bedroom).use { member2 =>
            for {
              _ <- member2.send(messageFrom2to1)
              _ <- member1.send(messageFrom1to2)
              member1InboxContent <- member1.inbox.take(1).compile.toList
              member2InboxContent <- member2.inbox.take(1).compile.toList
            } yield {
              member1InboxContent shouldBe List(messageFrom2to1)
              member2InboxContent shouldBe List(messageFrom1to2)
            }
          }
        }
      }
    } yield {
      succeed
    }
  }.unsafeToFuture()

  "Messages are not delivered from another room" in {
    for {
      exchange <- MessageExchange.inMemory[IO, Room, Message]
      _ <- {
        val bedroom = "bedroom"
        val bathroom = "bathroom"
        val messageFrom2to1 = "Hi, member1"
        val messageFrom1to2 = "Hi, member2"

        exchange.join(bedroom).use { member1 =>
          exchange.join(bedroom).use { member2 =>
            exchange.join(bathroom).use { member3 =>
              for {
                _ <- member3.send("Hello everybody :3")
                _ <- member2.send(messageFrom2to1)
                _ <- member1.send(messageFrom1to2)
                member1InboxContent <- member1.inbox.take(1).compile.toList
                member2InboxContent <- member2.inbox.take(1).compile.toList
              } yield {
                member1InboxContent shouldBe List(messageFrom2to1)
                member2InboxContent shouldBe List(messageFrom1to2)
              }
            }
          }
        }
      }
    } yield {
      succeed
    }
  }.unsafeToFuture()
}

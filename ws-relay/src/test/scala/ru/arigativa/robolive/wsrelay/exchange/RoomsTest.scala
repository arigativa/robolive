package ru.arigativa.robolive.wsrelay.exchange

import cats.effect.IO
import cats.effect.concurrent.Ref
import org.scalatest.freespec.{AnyFreeSpec, AsyncFreeSpec}
import org.scalatest.matchers.should.Matchers


class RoomsTest extends AsyncFreeSpec with Matchers {

  type Room = String
  type Member = String


  "After member done his work, room is empty" in {
    val roomId = "bath room"
    for {
      rooms <- Rooms.make[IO, Room, Member]()
      _ <- rooms.joinMember("john", roomId).use(_ => IO.unit)
    } yield {
      rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe Set.empty
    }
  }.unsafeToFuture()

  "After member done his work, room has previous people" in {
    val roomId = "toilet"
    val initialPeople = Set("kakakha", "ssaka")
    val newMember = "puk"
    for {
      rooms <- Rooms.make[IO, Room, Member](Map(roomId -> initialPeople))
      _ <- rooms.joinMember(newMember, roomId).use(_ => IO.unit)
    } yield {
      rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe initialPeople
    }
  }.unsafeToFuture()

  "While member in the room, getRoomMembers count him" in {
    val roomId = "bed room"
    val initialPeople = Set("brush", "shampoo", "soap")
    val newMember = "water"
    for {
      rooms <- Rooms.make[IO, Room, Member](Map(roomId -> initialPeople))
      _ <- rooms.joinMember(newMember, roomId).use { _ =>
        IO {
          rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe (initialPeople + newMember)
        }
      }
    } yield {
      rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe initialPeople
    }
  }.unsafeToFuture()

  "Internal neighbors getter returns everybody but registered member" in {
    val roomId = "secret room"
    val initialPeople = Set("alex", "egor", "robert")
    val newMember = "yulia"
    for {
      rooms <- Rooms.make[IO, Room, Member](Map(roomId -> initialPeople))
      _ <- rooms.joinMember(newMember, roomId).use { getNeighbors =>
        IO {
          getNeighbors.unsafeRunSync() shouldBe (initialPeople)
          rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe (initialPeople + newMember)
        }
      }
    } yield {
      rooms.getRoomMembers(roomId).unsafeRunSync() shouldBe initialPeople
    }
  }.unsafeToFuture()

  "When somebody joined the room, it's visible with neighbors getter" in {
    val roomId = "lake"
    val member1 = "fisher 1"
    val member2 = "fisher 2"
    for {
      rooms <- Rooms.make[IO, Room, Member]()
      _ <- rooms.joinMember(member1, roomId).use { getNeighborsFor1 =>
        IO {
          getNeighborsFor1.unsafeRunSync() shouldBe Set.empty

          rooms.joinMember(member2, roomId).use { getNeighborsFor2 =>

            getNeighborsFor2.unsafeRunSync() shouldBe Set(member1)
            getNeighborsFor1.unsafeRunSync() shouldBe Set(member2)

            IO.unit
          }.unsafeRunSync()

          // empty again after member2 left
          getNeighborsFor1.unsafeRunSync() shouldBe Set.empty
        }
      }
    } yield {
      succeed
    }
  }.unsafeToFuture()

  "After last member left the room it's deleted from internal state" in {
    // memory leak test
    val roomA = "small room"
    val roomB = "even smaller room"
    val member1 = "very fat guy"
    val member2 = "fat guy"
    for {
      roomsRef <- Ref.of[IO, Map[Room, Set[Member]]](Map.empty)
      rooms = new Rooms[IO, Room, Member](roomsRef)
      _ <- {
        for {
          _ <- rooms.joinMember(member1, roomA)
          _ <- rooms.joinMember(member2, roomA)
          _ <- rooms.joinMember(member1, roomB)
        } yield ()
      }.use { _ =>
        rooms.getRoomMembers(roomA).unsafeRunSync() shouldBe Set(member1, member2)
        rooms.getRoomMembers(roomB).unsafeRunSync() shouldBe Set(member1)
        roomsRef.get.unsafeRunSync() shouldBe Map(
          roomA -> Set(member1, member2),
          roomB -> Set(member1),
        )
        IO.unit
      }
      finalState <- roomsRef.get
    } yield {
      finalState shouldBe Map.empty
    }
  }.unsafeToFuture()
}

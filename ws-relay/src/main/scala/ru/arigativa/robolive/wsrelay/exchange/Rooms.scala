package ru.arigativa.robolive.wsrelay.exchange

import cats.Monad
import cats.effect.concurrent.Ref
import cats.effect.{Resource, Sync}
import cats.implicits._


class Rooms[F[_] : Monad, RoomId, MemberId] private[exchange] (roomsRef: Ref[F, Map[RoomId, Set[MemberId]]]) {

  type NeighborsGetter = F[Set[MemberId]]

  def joinMember(memberId: MemberId, roomId: RoomId): Resource[F, NeighborsGetter] = {
    val addMemberToRoom: F[Unit] =
      roomsRef.update { rooms =>
        val result = rooms.updatedWith(roomId) {
          case Some(members) => Some(members + memberId)
          case None => Some(Set(memberId))
        }
        result
      }

    val removeMemberFromRoom: F[Unit] =
      roomsRef.update { rooms =>
        val result = rooms.updatedWith(roomId) {
          case Some(members) => Some(members - memberId).filter(_.nonEmpty)
          case None => None
        }
        result
      }

    Resource.make(addMemberToRoom)(_ => removeMemberFromRoom)
      .map(_ => getRoomMembers(roomId).map(_ - memberId))
  }

  def getRoomMembers(roomId: RoomId): F[Set[MemberId]] =
    roomsRef.get.map(_.getOrElse(roomId, Set.empty))
}

object Rooms {
  def make[F[_] : Sync, RoomId, MemberId](
                                           initialState: Map[RoomId, Set[MemberId]] = Map.empty[RoomId, Set[MemberId]]
                                         ): F[Rooms[F, RoomId, MemberId]] =
    for {
      roomsRef <- Ref[F].of(initialState)
    } yield new Rooms(roomsRef)
}
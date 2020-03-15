package ru.arigativa.robolive.wsrelay.exchange

import cats.{Functor, Monad}
import cats.effect.{Resource, Sync}
import cats.effect.concurrent.Ref
import cats.implicits._


class Rooms[F[_] : Monad, RoomId, MemberId] private(roomsRef: Ref[F, Map[RoomId, Set[MemberId]]]) {

  type NeighborsGetter = F[Set[MemberId]]

  def joinMember(memberId: MemberId, roomId: RoomId): Resource[F, NeighborsGetter] = {
    val addMemberToRoom: F[Unit] =
      roomsRef.update { rooms =>
        rooms.updatedWith(roomId) {
          case Some(members) => Some(members + memberId)
          case None => Some(Set(memberId))
        }
      }

    val removeMemberFromRoom: F[Unit] =
      roomsRef.update { rooms =>
        rooms.updatedWith(roomId) {
          case Some(members) => Some(members - memberId).filter(_.nonEmpty)
          case None => None
        }
      }

    Resource.make(addMemberToRoom)(_ => removeMemberFromRoom)
      .map(_ => getRoomMembers(roomId).map(_ - memberId))
  }

  def getRoomMembers(roomId: RoomId): F[Set[MemberId]] =
    roomsRef.get.map(_.getOrElse(roomId, Set.empty))
}

object Rooms {
  def make[F[_] : Sync, RoomId, MemberId]: F[Rooms[F, RoomId, MemberId]] =
    for {
      roomsRef <- Ref[F].of(Map.empty[RoomId, Set[MemberId]])
    } yield new Rooms(roomsRef)
}
package robolive.app

import robolive.utils.{Hex, RoombaDSL}

object RoombaDrive extends App {

  args.toList match {
    case velocity :: radius :: Nil =>

      println(Hex.encodeBytes(
        RoombaDSL.drive(velocity.toInt, radius.toInt)
      ))

    case _ =>
      println("Usage: roomba-drive [velocity] [radius]")
  }
}

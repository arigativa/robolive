package agent
import agent.utils.Hex

object RoombaDriveApp extends App {

  val DriveOpcode: Byte = 137.byteValue

  def drive(velocity: Int, radius: Int) = {
    Array[Byte](
      DriveOpcode,
      (velocity >> 8).toByte,
      velocity.toByte,
      (radius >> 8).toByte,
      radius.toByte,
    )
  }

  args.toList match {
    case velocity :: radius :: Nil =>
      println(
        Hex.encodeBytes(
          drive(velocity.toInt, radius.toInt)
        )
      )

    case _ =>
      println("Usage: roomba-drive [velocity] [radius]")
  }
}

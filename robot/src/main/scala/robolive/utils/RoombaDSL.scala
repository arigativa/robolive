package robolive.utils

object RoombaDSL {
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
}

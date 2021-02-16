package robolive

import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import robolive.utils.Hex

class HexSpec extends AnyFreeSpec with Matchers {
  "Hex" - {
    Hex.decodeBytes("DeaD00") shouldBe Array(0xDE.toByte, 0xAD.toByte, 0.toByte)
  }
}

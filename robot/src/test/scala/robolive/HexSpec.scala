package robolive

import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import robolive.utils.Hex

class HexSpec extends AnyFreeSpec with Matchers {
  "Hex" - {
    "decode" in {
      Hex.decodeBytes("DeaD00") shouldBe Array(0xDE, 0xAD, 0).map(_.byteValue)
    }

    "encode" in {
      Hex.encodeBytes(Array(0xff, 0x80, 0x00).map(_.byteValue)) shouldBe "ff8000"
    }
  }
}

package robolive

import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import robolive.utils.RoombaDSL

class RoombaDSLSpec extends AnyFreeSpec with Matchers {
  "RoombaDSL" - {
    "build examples" in {
      RoombaDSL.drive(-200, 500) shouldBe Array(137, 255, 56, 1, 244).map(_.byteValue)
    }
  }
}

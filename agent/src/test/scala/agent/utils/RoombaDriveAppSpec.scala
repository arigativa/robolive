package agent.utils

import agent.RoombaDriveApp
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

class RoombaDriveAppSpec extends AnyFreeSpec with Matchers {
  "RoombaDSL" - {
    "build examples" in {
      RoombaDriveApp.drive(-200, 500) shouldBe Array(137, 255, 56, 1, 244).map(_.byteValue)
    }
  }
}

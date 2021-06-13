package robolive

import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers
import robolive.managed.SimpleFunctionCalculator

class SimpleFunctionSpec extends AnyFreeSpec with Matchers {

  "SimpleFunctionCalculator.simpleTemplateFunction" - {
    "should parse function call syntax" in {
      SimpleFunctionCalculator.simpleTemplateFunction("noparams") shouldBe Some(
        ("noparams", Seq.empty)
      )
      SimpleFunctionCalculator.simpleTemplateFunction("name(firstarg)") shouldBe Some(
        ("name", Seq("firstarg"))
      )
      SimpleFunctionCalculator.simpleTemplateFunction("name(firstarg,secondarg)") shouldBe Some(
        ("name", Seq("firstarg", "secondarg"))
      )
      SimpleFunctionCalculator.simpleTemplateFunction("name(1,2,3,4)") shouldBe Some(
        ("name", Seq("1", "2", "3", "4"))
      )
    }

    "should calculate templates" in {
      val calc = new SimpleFunctionCalculator(
        Map(
          "const" -> "CONST",
          "function1(onearg)" -> "function with one arg $$onearg$$",
          "jetson_camera(sensor_id,sensor_mode,flip_method)" -> "nvarguscamerasrc sensor_id=$$sensor_id$$ sensor_mode=$$sensor_mode$$ ! nvvidconv flip-method=$$flip_method$$",
        )
      )

      calc.calculate("function1(xxx)") shouldBe Some("function with one arg xxx")
      calc.calculate("jetson_camera(0,3,0)") shouldBe Some(
        "nvarguscamerasrc sensor_id=0 sensor_mode=3 ! nvvidconv flip-method=0"
      )
    }
  }
}

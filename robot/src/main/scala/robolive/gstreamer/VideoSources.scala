package robolive.gstreamer

class VideoSources(sourceFunctions: SimpleFunctionCalculator, defaultSource: String) {
  def getSource(invocation: String): String = {
    if (invocation.startsWith("pipeline(") && invocation.endsWith(")")) {
      invocation.drop("pipeline(".size).dropRight(1)
    } else {
      sourceFunctions.calculate(invocation).getOrElse(defaultSource)
    }
  }
}

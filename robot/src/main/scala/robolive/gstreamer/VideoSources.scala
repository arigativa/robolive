package robolive.gstreamer

class VideoSources(sourceFunctions: SimpleFunctionCalculator, defaultSource: String) {
  def getSource(invocation: String): String = {
    sourceFunctions.calculate(invocation).getOrElse(defaultSource)
  }
}

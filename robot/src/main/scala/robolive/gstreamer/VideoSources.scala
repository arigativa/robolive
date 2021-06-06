package robolive.gstreamer

import robolive.managed.AgentState.VideoSrcFn

trait VideoSources {
  def getFromSettings(settings: Map[String, String]): String
}

class TemplatedVideoSource(sourceFunctions: SimpleFunctionCalculator, defaultSource: String) extends VideoSources {
  def getSource(invocation: String): String = {
    if (invocation.startsWith("pipeline(") && invocation.endsWith(")")) {
      invocation.drop("pipeline(".size).dropRight(1)
    } else {
      sourceFunctions.calculate(invocation).getOrElse(defaultSource)
    }
  }

  def getFromSettings(settings: Map[String, String]): String = {
    getSource(settings.getOrElse(VideoSrcFn, "unknown"))
  }
}

class ConstVideoSource(value: String) extends VideoSources {
  def getFromSettings(settings: Map[String, String]): String = value
}

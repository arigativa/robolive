package robolive.managed.state

case class ExitState(
  exitCode: Int,
  updateRequested: Boolean = false,
  rebootRequested: Boolean = false,
  lastError: Option[String] = None
)

object ExitState {

  val statePath: String = sys.env.getOrElse("EXIT_STATE_PATH", "/var/run/managed-robot.exit-state")

  def writeState(exitState: ExitState) = {
    // todo write state to [[statePath]]
    println(s"Exit state: $exitState")
  }
}

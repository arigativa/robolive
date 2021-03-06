package robolive

package object app {

  def getEnv(name: String, default: => String): String =
    sys.env.getOrElse(name, default)

  def getEnv(name: String): Option[String] = sys.env.get(name)

}

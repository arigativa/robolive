package robolive.puppet

import scala.concurrent.Future

trait ClientInputInterpreter {
  def clientInput(input: String): Future[String]
}

package org.slf4j

import org.zoolu.util.{LogLevel, Logger => ZLogger}


// the name should start with Logger in order to be consdered as a part of a logging framework
// this affects how caller/file/line loggin parameters are evaluated
class LoggerForZoolupa(zLogger: Logger) extends ZLogger {
  override def log(message: String): Unit = zLogger.info(message)
  override def log(level: LogLevel, message: String): Unit = zLogger.info(message)
  override def log(level: LogLevel, source_class: Class[_], message: String): Unit = zLogger.info(message)
}

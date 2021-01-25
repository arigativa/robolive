package org.slf4j

import org.zoolu.util.{LogLevel, Logger => ZLogger}


// the name should start with Logger in order to be consdered as a part of a logging framework
// this affects how caller/file/line loggin parameters are evaluated
class LoggerForZoolupa(classicLogger: Logger) extends ZLogger {

  override def log(message: String): Unit = log(LogLevel.INFO, message)
  override def log(level: LogLevel, source_class: Class[_], message: String): Unit = log(level, message)

  override def log(level: LogLevel, message: String): Unit = {
    level match {
      case LogLevel.SEVERE => classicLogger.error(message)
      case LogLevel.WARNING => classicLogger.warn(message)
      case LogLevel.INFO => classicLogger.info(message)
      case LogLevel.DEBUG => classicLogger.debug(message)
      case LogLevel.TRACE => classicLogger.trace(message)

      case LogLevel.OFF => classicLogger.warn(message)
      case LogLevel.ALL => classicLogger.trace(message)
    }
  }
}

package gstmanaged.managed

import gstmanaged.managed.GstManaged.GSTInit
import org.freedesktop.gstreamer.{Bus, Gst, GstObject, Pipeline}

object PipelineManaged {

  trait Logger {
    def error(message: String): Unit
  }

  object Logger {
    def toSlf4(logger: org.slf4j.Logger): Logger = { (message: String) =>
      logger.error(message)
    }
  }

  private def initBus(bus: Bus, logger: Logger): Unit = {
    val eosHandler: Bus.EOS = { (source: GstObject) =>
      logger.error(s"EOS ${source.getName}")
    }

    val errorHandler: Bus.ERROR = { (source: GstObject, code: Int, message: String) =>
      logger.error(s"Error ${source.getName}: $code $message")
    }

    bus.connect(eosHandler)
    bus.connect(errorHandler)
  }

  def apply(name: String, description: String, logger: Logger)(
    implicit ev: GSTInit.type
  ): Pipeline = {
    val process = Gst.parseBinFromDescription(description, false)
    val pipeline = new Pipeline(name)
    val added = pipeline.add(process)
    assert(added, "Can not add bin to pipeline")
    initBus(pipeline.getBus, logger)
    pipeline
  }

  def apply(name: String, description: String, logger: org.slf4j.Logger)(
    implicit ev: GSTInit.type
  ): Pipeline = apply(name, description, PipelineManaged.Logger.toSlf4(logger))
}

package robolive

import java.util.concurrent.LinkedTransferQueue

import scala.sys.process.ProcessIO

class ServoController(cliCommand: String) {
  import sys.process._

  private val commandQueue = new LinkedTransferQueue[String]()

  private val cli = cliCommand.run(
    new ProcessIO(
      in => {
        println("started servo controller command writer")
        val writer = new java.io.PrintWriter(in)
        while (true) {
          val command = commandQueue.take()
          println(s"Command sent: $command")
          writer.println(command)
          writer.flush()
        }
        writer.close()
      },
      out => {
        println("started servo controller output reader")
        val src = scala.io.Source.fromInputStream(out)
        for (line <- src.getLines()) {
          println("CLI output: " + line)
        }
        src.close()
      },
      _.close()
    )
  )

  def servoProxy(servoId: Int, angle: Int): Unit = {
    if (!cli.isAlive()) {
      println("ERROR: cli is not alive")
    }
    commandQueue.offer(s"servo $servoId $angle")
  }
}

object ServoController {

  def make: ServoController = {
    val cliCommand = sys.env.getOrElse("SERVO_CLI_COMMAND", "~/servo-cli.py")
    new ServoController(cliCommand)
  }
}

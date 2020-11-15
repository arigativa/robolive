package robolive.gstreamer

class SimpleFunctionCalculator(rawFunctions: Map[String, String]) {

  private val functions: Map[String, Seq[String] => Option[String]] =
    rawFunctions
      .map { case (functionDef, outputTemplate) =>
        SimpleFunctionCalculator.simpleTemplateFunction(functionDef) match {
          case Some((functionName, argumentsNames)) =>
            val outputFunction: Seq[String] => Option[String] =
              (argumentValues) => {
                if (argumentsNames.length == argumentValues.length) {
                  Some(
                    (argumentsNames zip argumentValues)
                      .foldLeft(outputTemplate) {
                        case (template, (argName, argValue)) =>
                          template.replace("$$" + argName + "$$", argValue)
                      }
                  )
                } else {
                  None
                }
              }

            (functionName, outputFunction)

          case None => throw new RuntimeException(s"can't parse function definition: $functionDef")
        }
      }

  def calculate(invocation: String): Option[String] = {
    for {
      (funcName, args) <- SimpleFunctionCalculator.simpleTemplateFunction(invocation)
      outputFunction <- functions.get(funcName)
      result <- outputFunction(args)
    } yield {
      result
    }
  }
}


object SimpleFunctionCalculator {

  def simpleTemplateFunction(definition: String): Option[(String, Seq[String])] = {
    val defSyntax = """(\w+)(\((\w+(,(\w+))*)\))?""".r

    defSyntax.findFirstMatchIn(definition).map { m =>
      (m.group(1), Option(m.group(3)).toSeq.flatMap(_.split(",")).map(_.trim))
    }
  }

}

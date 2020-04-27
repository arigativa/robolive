name := "robot-sca"

version := "0.1"

scalaVersion := "2.13.1"

val zioVersion = "1.0.0-RC18-2"
val sttpVersion = "2.0.7"
val circeVersion = "0.12.3"

libraryDependencies ++= Seq(
  "org.freedesktop.gstreamer" % "gst1-java-core" % "1.1.0",
  "com.softwaremill.sttp.client" %% "core" % sttpVersion,
  "com.softwaremill.sttp.client" %% "async-http-client-backend-zio" % sttpVersion,
  "dev.zio" %% "zio" % zioVersion,
  "io.circe" %% "circe-core" % circeVersion,
  "io.circe" %% "circe-generic" % circeVersion,
  "io.circe" %% "circe-parser" % circeVersion,
  "io.circe" %% "circe-generic-extras" % "0.13.0",
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "org.slf4j" % "jul-to-slf4j" % "1.7.30",
  "dev.zio" %% "zio-test" % zioVersion % Test,
  "dev.zio" %% "zio-test-sbt" % zioVersion % Test,
)

testFrameworks += new TestFramework("zio.test.sbt.ZTestFramework")

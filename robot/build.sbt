organization := "ru.arigativa.robolive"
name := "robot"
version := "1.0"
scalaVersion := "2.13.1"

javacOptions ++= Seq("-source", "1.8", "-target", "1.8")

libraryDependencies ++= Seq(
  "org.freedesktop.gstreamer" % "gst1-java-core" % "1.1.0",
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "org.slf4j" % "jul-to-slf4j" % "1.7.30",

  "io.grpc" % "grpc-netty-shaded" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion,
)

PB.protoSources in Compile := Seq(file("protocols"))

PB.targets in Compile := Seq(
  scalapb.gen(grpc = true) -> (sourceManaged in Compile).value / "robolive" / "protocols"
)

val circeVersion = "0.12.3"

libraryDependencies ++= Seq(
  "io.circe" %% "circe-core",
  "io.circe" %% "circe-generic",
  "io.circe" %% "circe-parser"
).map(_ % circeVersion)

// please, run `docker build -t robot-base .` from root folder
dockerBaseImage := "robot-base"

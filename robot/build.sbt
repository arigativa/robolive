organization := "robolive"
name := "robot"
version := "1.0"
scalaVersion := "2.13.3"

buildInfoPackage := "robolive"
buildInfoKeys := Seq[BuildInfoKey](
  name, version, scalaVersion, sbtVersion,
  git.gitHeadCommit,
  git.branch,
  git.gitUncommittedChanges,
  git.gitHeadMessage,
  git.gitHeadCommitDate,
)
buildInfoOptions += BuildInfoOption.BuildTime

libraryDependencies ++= Seq(
  "org.freedesktop.gstreamer" % "gst1-java-core" % "1.1.0",
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "org.slf4j" % "jul-to-slf4j" % "1.7.30",
  "io.grpc" % "grpc-netty-shaded" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion,
  "com.fazecast" % "jSerialComm" % "2.6.2",

  "org.scalatest" %% "scalatest" % "3.2.2" % "test",
)

val circeVersion = "0.12.3"

libraryDependencies ++= Seq(
  "io.circe" %% "circe-core",
  "io.circe" %% "circe-generic",
  "io.circe" %% "circe-parser"
).map(_ % circeVersion)

PB.protoSources in Compile := Seq(file("protocols"))

PB.targets in Compile := Seq(
  scalapb.gen(grpc = true) -> (sourceManaged in Compile).value / "robolive" / "protocols"
)

/* Packaging */

topLevelDirectory := None
packageName in Universal := "robot"

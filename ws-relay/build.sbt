
name := "ws-relay"
organization := "ru.arigativa.robolive"
version := "1.0"
scalaVersion := "2.13.1"

// build from https://github.com/arigativa/http4s/tree/websocket-with-one-pipe
// with command: sbt publishLocal
val Http4sVersion = "1.0.0-M0+251-a8753366-SNAPSHOT"
val CirceVersion = "0.13.0"
val Specs2Version = "4.8.3"
val LogbackVersion = "1.2.3"

libraryDependencies ++= Seq(
  "org.http4s"        %% "http4s-blaze-server" % Http4sVersion,
  "org.http4s"        %% "http4s-blaze-client" % Http4sVersion,
  "org.http4s"        %% "http4s-circe"        % Http4sVersion,
  "org.http4s"        %% "http4s-dsl"          % Http4sVersion,
  "io.circe"          %% "circe-generic"       % CirceVersion,
  "ch.qos.logback"    %  "logback-classic"     % LogbackVersion,
  "io.chrisdavenport" %% "log4cats-slf4j"      % "1.0.1",
  "org.scalatest"     %% "scalatest"           % "3.1.1" % "test",
  "org.scalacheck"    %% "scalacheck"          % "1.14.1" % "test",
)


addCompilerPlugin("org.typelevel" %% "kind-projector"     % "0.10.3")
addCompilerPlugin("com.olegpy"    %% "better-monadic-for" % "0.3.0")

dockerBaseImage := "openjdk:9" // maybe even higher, but not lower
dockerExposedPorts := Seq(5000)
dockerEnvVars := Map("PORT" -> "5000")

scalacOptions ++= Seq(
  "-deprecation",
  "-encoding", "UTF-8",
  "-language:higherKinds",
  "-language:postfixOps",
  "-feature",
  "-Xfatal-warnings",
)

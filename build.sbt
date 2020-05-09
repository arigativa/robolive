name := "robolive"

version := "0.1"

scalaVersion := "2.13.1"

lazy val wsRelay = (project in file("ws-relay")) enablePlugins (DockerPlugin, JavaServerAppPackaging)
lazy val robot = (project in file("robot"))

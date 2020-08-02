organization := "ru.arigativa.robolive"
name := "registry"
version := "1.0"
scalaVersion := "2.13.1"

sources in (Compile, doc) := Seq.empty
publishArtifact in (Compile, packageDoc) := false

libraryDependencies ++= Seq(
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "org.slf4j" % "jul-to-slf4j" % "1.7.30",

  "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion,
)

PB.protoSources in Compile := Seq(file("protocols"))

PB.targets in Compile := Seq(
  scalapb.gen(grpc = true) -> (sourceManaged in Compile).value / "robolive" / "protocols"
)

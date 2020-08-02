enablePlugins(GraalVMNativeImagePlugin)

organization := "ru.arigativa.robolive"
name := "registry"
version := "1.0"
scalaVersion := "2.13.3"

onChangedBuildSource := ReloadOnSourceChanges

javacOptions ++= Seq("-source", "1.8", "-target", "1.8")

libraryDependencies ++= Seq(
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "org.slf4j" % "jul-to-slf4j" % "1.7.30",

  "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion,
)

/**
 * if version is specified, docker image will be used
 * java8 is used because of some incompatibilities
 */
graalVMNativeImageGraalVersion := Some("20.1.0-java8-ol8")
graalVMNativeImageOptions ++= Seq(
  "-H:+TraceClassInitialization",
//  "--initialize-at-run-time=io.netty.handler.ssl.ConscryptAlpnSslEngine",
//  "--initialize-at-run-time=io.netty.handler.ssl.ReferenceCountedOpenSslEngine",
//  "--initialize-at-run-time=io.netty.util.internal.logging.Log4JLogger",
  "-H:ReflectionConfigurationFiles=/opt/graalvm/graalvm/reflect-config.json",
  "-H:Name=protoc-gen-scalapb",
  "--initialize-at-build-time",
  "--initialize-at-run-time=io.netty.buffer.PooledByteBufAllocator",
  "--initialize-at-run-time=io.grpc.netty.Utils$ByteBufAllocatorPreferDirectHolder",
  "--initialize-at-run-time=io.grpc.netty.Utils$ByteBufAllocatorPreferHeapHolder",
  "--initialize-at-build-time=ch.qos.logback",
  "--initialize-at-build-time=org.slf4j",
  "--initialize-at-build-time=scala.runtime.Statics",
  "--initialize-at-build-time=scala.runtime.Statics.VM",
  "--initialize-at-run-time=io.netty.handler.codec.http2.DefaultHttp2FrameWriter",
  "--allow-incomplete-classpath",
//  "--report-unsupported-elements-at-runtime",
  "--no-fallback", // don't compile just jar if binary compilation failed
)

PB.protoSources in Compile := Seq(file("protocols"))

PB.targets in Compile := Seq(
  scalapb.gen(grpc = true) -> (sourceManaged in Compile).value / "robolive" / "protocols"
)

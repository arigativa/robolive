organization := "robolive"
name := "gstmanaged"
version := "1.0"
scalaVersion := "2.13.3"

buildInfoPackage := "robolive"
buildInfoKeys := Seq[BuildInfoKey](
  name,
  version,
  scalaVersion,
  sbtVersion,
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
  "org.scalatest" %% "scalatest" % "3.2.2" % "test",
)

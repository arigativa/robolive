name := "robolive"

version := "0.1"

scalaVersion := "2.13.1"

lazy val robot = (project in file("robot")) enablePlugins (JavaServerAppPackaging) dependsOn (mjsip, sdp)
lazy val registry =
  (project in file("registry"))
    .enablePlugins(JavaServerAppPackaging, BuildInfoPlugin)
    .settings(
      buildInfoKeys := Seq[BuildInfoKey](name, version),
      buildInfoPackage := "robolive.meta"
    )
lazy val mjsip = (project in file("mjsip"))
lazy val sdp = (project in file("sdp"))

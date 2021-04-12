package robolive.server.client

import robolive.server.Server

import java.io.FileNotFoundException
import java.util.concurrent.{ConcurrentHashMap, ConcurrentMap}
import scala.util.{Failure, Success}

final class UserState(
  userDataStorage: UserDataStorage,
  userDataMap: ConcurrentMap[(UserState.Login, UserState.Password), UserState.UserData]
) {
  def addUIDescription(
    userLogin: UserState.Login,
    userPassword: UserState.Password,
    agentLogin: Server.Login,
    uiDescription: UserState.UIDescription
  ): Unit = {
    val userData = userDataMap.get((userLogin, userPassword, agentLogin))
    if (userData ne null) {
      val uis = userData.uiDescriptions
      val updatedUIs = uis.updated(agentLogin, uiDescription)
      val updatedUserData = userData.copy(uiDescriptions = updatedUIs)
      userDataMap.put((userLogin, userPassword), updatedUserData)
    } else {
      val userData = UserState.UserData(Map(agentLogin -> uiDescription))
      userDataMap.put((userLogin, userPassword), userData)
    }
    dump()
  }

  def getUIDescription(
    userLogin: UserState.Login,
    userPassword: UserState.Password,
    agentLogin: Server.Login,
  ): Option[UserState.UIDescription] = {
    Option(userDataMap.get((userLogin, userPassword)))
      .flatMap(_.uiDescriptions.get(agentLogin))
  }

  private def toPersistentView = {
    import scala.jdk.CollectionConverters._
    import UserDataStorage._

    userDataMap.asScala.map {
      case ((userLogin, userPassword), userData) =>
        val uiDescriptions = userData.uiDescriptions.map {
          case (agentLogin, uiDescription) =>
            val pButtons = uiDescription.buttons.map(b => PersistentButton(b.name, b.template))
            agentLogin -> PersistentUIDescription(pButtons)
        }
        PersistentUserData(userLogin, userPassword, uiDescriptions)
    }.toList
  }

  private def dump() = {
    userDataStorage.write(toPersistentView)
  }
}

object UserState {
  def apply(userDataStorage: UserDataStorage): UserState = {
    val userDataMap =
      new ConcurrentHashMap[(UserState.Login, UserState.Password), UserState.UserData]()

    val userState = new UserState(userDataStorage, userDataMap)

    userDataStorage.read() match {
      case Failure(_: FileNotFoundException) =>
        userState.dump()
        userState

      case Failure(error) => throw error

      case Success(persistentUserDataList) =>
        persistentUserDataList.foreach { pUserData =>
          val uiDescriptions = pUserData.uiSettings.map {
            case (agentLogin, pUIDescription) =>
              agentLogin -> UIDescription(
                pUIDescription.buttons.map(pB => Button(pB.name, pB.template))
              )
          }
          userDataMap.put(
            (pUserData.login, pUserData.password),
            UserData(uiDescriptions)
          )
        }
        userState
    }
  }

  type Login = String
  type Password = String

  final case class UserData(
    uiDescriptions: Map[Server.Login, UIDescription]
  )

  final case class UIDescription(
    buttons: Seq[Button]
  )

  final case class Button(name: String, template: String)
}

package robolive.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

import robolive.protocols.Inventory.Command.Command.Restart
import robolive.protocols.Inventory.Command.RestartRobot
import robolive.protocols.Inventory.RegistryInventoryGrpc.RegistryInventory
import robolive.protocols.Inventory.{RobotStatus, Command => RobotCommand}
import robolive.protocols.Registry.RegistryOperatorGrpc.RegistryOperator
import robolive.protocols.Registry.RobotsListResponse.RobotState
import robolive.protocols.Registry.StartCallResponse.{CreatedSession, Rejection, Result}
import robolive.protocols.Registry._
import robolive.protocols.Robot.RobotID
import robolive.server.RobotRegistry.SendCommand

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._

class RegistryProtoServer(implicit ec: ExecutionContext) {

  private val joinedRobots =
    new ConcurrentHashMap[RobotID, (RobotStatus, SendCommand)]()

  case class Call(userId: UserID, robotId: RobotID, robotCall: RobotCall)
  type CallTable = Map[CallID, Call]

  private val callTable = new AtomicReference[CallTable](Map.empty)

  val inventory: RegistryInventory = new RobotRegistry(joinedRobots)

  val operator: RegistryOperator = new RegistryOperator {
    override def robotsList(request: RobotsListRequest): Future[RobotsListResponse] = {
      Future {
        RobotsListResponse(
          joinedRobots.elements().asScala.toList.map(_._1.description)
            .map { desc =>
              val isOnCall = callTable.get().exists(_._2.robotId == desc.id)
              RobotState(desc, isOnCall)
            }
        )
      }
    }

    override def restartRobot(request: RestartRobotRequest): Future[RestartRobotResponse] = {
      joinedRobots.get(request.id) match {
        case null => Future.failed(new RuntimeException("No such robot online"))
        case (_, sendCommand) =>
          sendCommand(RobotCommand(
            Restart(RestartRobot(request.forceUpdate, request.rebootSystem))
          ))
          Future.successful(RestartRobotResponse())
      }
    }

    override def startCall(request: StartCallRequest): Future[StartCallResponse] = {
      val updateCallTable = callTable.updateAndGet(currentState => {
        findRobotCall(request.robotID, currentState) match {
          case Some(_) => currentState
          case None =>
            val (callId, call) = createNewCall(request.robotID, request.userID)
            currentState.updated(callId, call)
        }
      })

      findRobotCall(request.robotID, updateCallTable) match {
        case Some((callId, call)) =>
          if (call.userId != request.userID)
            Future.successful(StartCallResponse(Result.Rejection(Rejection("robot is busy with another user"))))
          else
            Future.successful(StartCallResponse(Result.Session(CreatedSession(callId, call.robotCall))))
        case None =>
          Future.successful(StartCallResponse(Result.Rejection(Rejection("unexpected error: call should have been created, but it didn't"))))
      }
    }

    private def createNewCall(robotID: RobotID, userID: UserID): (CallID, Call) = {
      val callId = CallID(UUID.randomUUID().toString)
      (callId, Call(
        userID, robotID, RobotCall(
          robotUsername = "robomachine", // TODO make unique
          username = "robohuman", // TODO make unique
          password = "",
          server = "",
        )
      ))
    }

    private def findRobotCall(robotID: RobotID, currentState: CallTable): Option[(CallID, Call)] = {
      currentState.collectFirst {
        case (callId, call@Call(_, callRobotId, _)) if robotID == callRobotId =>
          (callId, call)
      }
    }

    override def stopCall(request: CallID): Future[StopCallResponse] = {
      callTable.updateAndGet(calls => {
        // TODO send HANGUP to signalling
        calls.filter(_._1 != request)
      })
      Future.successful(StopCallResponse())
    }
  }

}


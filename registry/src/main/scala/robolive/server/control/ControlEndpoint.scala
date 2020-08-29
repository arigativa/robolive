package robolive.server.control
import java.io.{BufferedReader, ByteArrayInputStream, InputStream, InputStreamReader}
import java.nio.charset.StandardCharsets
import java.util.stream.Collectors

import Control.RegistryControlGrpc.{METHOD_AGENT_LIST, METHOD_RESTART_AGENT, SERVICE}
import com.google.protobuf.ByteString
import io.circe.generic.semiauto.deriveCodec
import io.grpc.ServerServiceDefinition
import scalapb.UnknownFieldSet

import scala.concurrent.ExecutionContext

final class ControlJsonEndpoint(handler: ControlHandler)(ec: ExecutionContext) {
  import ControlEndpoint.ProtoFormatters._

  private val agentListMethodName: String = {
    _root_.io.grpc.MethodDescriptor.generateFullMethodName("RegistryControl", "AgentList")
  }

  private val MethodAgentListJson =
    _root_.io.grpc.MethodDescriptor
      .newBuilder()
      .setType(_root_.io.grpc.MethodDescriptor.MethodType.UNARY)
      .setFullMethodName(agentListMethodName)
      .setSampledToLocalTracing(true)
      .setRequestMarshaller(mkRequestMarshaller[Control.AgentListRequest])
      .setResponseMarshaller(mkResponseMarshaller[Control.AgentListResponse])
      .build()

  private val MethodRestartAgentJson = _root_.io.grpc.MethodDescriptor
    .newBuilder()
    .setType(_root_.io.grpc.MethodDescriptor.MethodType.UNARY)
    .setFullMethodName(
      _root_.io.grpc.MethodDescriptor.generateFullMethodName("RegistryControl", "RestartAgent")
    )
    .setSampledToLocalTracing(true)
    .setRequestMarshaller(mkRequestMarshaller[Control.RestartAgentRequest])
    .setResponseMarshaller(mkResponseMarshaller[Control.RestartAgentResponse])
    .build()

  val definition: ServerServiceDefinition = {
    _root_.io.grpc.ServerServiceDefinition
      .builder(
        _root_.io.grpc.ServiceDescriptor
          .newBuilder("RegistryControl")
          .addMethod(MethodAgentListJson)
          .addMethod(MethodRestartAgentJson)
          .build()
      )
      .addMethod(
        MethodAgentListJson,
        _root_.io.grpc.stub.ServerCalls
          .asyncUnaryCall[Control.AgentListRequest, Control.AgentListResponse](
            (
              request: Control.AgentListRequest,
              observer: _root_.io.grpc.stub.StreamObserver[Control.AgentListResponse]
            ) =>
              handler
                .agentList(request)
                .onComplete(scalapb.grpc.Grpc.completeObserver(observer))(ec)
          )
      )
      .addMethod(
        MethodRestartAgentJson,
        _root_.io.grpc.stub.ServerCalls
          .asyncUnaryCall[Control.RestartAgentRequest, Control.RestartAgentResponse](
            (
              request: Control.RestartAgentRequest,
              observer: _root_.io.grpc.stub.StreamObserver[Control.RestartAgentResponse]
            ) =>
              handler
                .restartAgent(request)
                .onComplete(scalapb.grpc.Grpc.completeObserver(observer))(ec)
          )
      )
      .build()
  }
}

object ControlEndpoint {
  object ProtoFormatters {
    import io.circe._
    import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
    import io.grpc.MethodDescriptor.Marshaller

    implicit val byteStringCodec: Codec[ByteString] = Codec.from(
      decodeA = Decoder.decodeArray[Byte].map(ByteString.copyFrom),
      encodeA = Encoder.encodeVector[Byte].contramap[ByteString](bs => Vector.from(bs.toByteArray))
    )
    implicit val unknownFieldCodec: Codec[UnknownFieldSet.Field] = deriveCodec
    implicit val unknownFieldsSetCodec: Codec[UnknownFieldSet] = deriveCodec

    implicit val agentViewCodec: Codec[Control.AgentView] = deriveCodec

    implicit val agentListRequest: Encoder[Control.AgentListRequest] = deriveEncoder
    implicit val agentListResponse: Decoder[Control.AgentListResponse] = deriveDecoder

    implicit val restartAgentRequest: Encoder[Control.RestartAgentRequest] = deriveEncoder
    implicit val restartAgentResponse: Decoder[Control.RestartAgentResponse] = deriveDecoder

    def mkRequestMarshaller[T: Encoder]: Marshaller[T] = {
      import io.circe.syntax._

      new Marshaller[T] {
        override def stream(value: T): InputStream = {
          val jsonAsString = value.asJson.noSpacesSortKeys
          new ByteArrayInputStream(jsonAsString.getBytes(StandardCharsets.UTF_8))
        }

        override def parse(stream: InputStream): T = ???
      }
    }

    def mkResponseMarshaller[T: Decoder]: Marshaller[T] = {
      new Marshaller[T] {
        override def stream(value: T): InputStream = ???

        override def parse(stream: InputStream): T = {
          val result = new BufferedReader(new InputStreamReader(stream))
            .lines()
            .collect(Collectors.joining(System.lineSeparator()))
          parser.decode[T](result).fold(throw _, identity)
        }
      }
    }
  }
}

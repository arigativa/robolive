package ru.arigativa.robolive.wsrelay.wsprotocol

import org.http4s.websocket.WebSocketFrame

trait MessageProtocol[T] {
  def encode(value: T): WebSocketFrame
  def decode(frame: WebSocketFrame): Option[T]
}

object MessageProtocol {
  implicit object StringProtocol extends MessageProtocol[String] {
    override def encode(value: String): WebSocketFrame = WebSocketFrame.Text(value)
    override def decode(frame: WebSocketFrame): Option[String] = {
      frame match {
        case WebSocketFrame.Text(value, _) => Some(value)
        case _ => None
      }
    }
  }

  def apply[T : MessageProtocol]: MessageProtocol[T] = implicitly[MessageProtocol[T]]
}

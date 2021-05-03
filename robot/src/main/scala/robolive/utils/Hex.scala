package robolive.utils

object Hex {
  def decodeBytes(s: String): Array[Byte] = {
    val len = s.length
    val data = new Array[Byte](len / 2)
    var i = 0
    while(i < len) {
      data(i / 2) = ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i + 1), 16)).toByte
      i += 2
    }
    data
  }

  private val HEX_ARRAY = "0123456789abcdef".toCharArray

  def encodeBytes(bytes: Array[Byte]): String = {
    val hexChars = new Array[Char](bytes.length * 2)
    var j = 0
    while (j < bytes.length) {
      val v = bytes(j) & 0xFF
      hexChars(j * 2) = HEX_ARRAY(v >>> 4)
      hexChars(j * 2 + 1) = HEX_ARRAY(v & 0x0F)

      j += 1
    }
    new String(hexChars)
  }
}

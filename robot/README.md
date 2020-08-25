How to run:
1 Start signalling  
2 Start client  
3 `docker build -t robolive-robot .` from root folder
4 `docker run --user root --env-file test.env --network host robolive-robot:latest`

issues:
`** (robomachine:6): CRITICAL **: 10:33:47.357: gst_dtls_connection_stop: assertion 'self->priv->ssl' failed`
"solved" by: `https://gitlab.freedesktop.org/gstreamer/gst-plugins-bad/-/issues/811`

chrome candidates are not parsed:
https://gitlab.freedesktop.org/gstreamer/gst-plugins-bad/-/issues/1139

gstreamer debug page docs:
https://gstreamer.freedesktop.org/documentation/tutorials/basic/debugging-tools.html?gi-language=c

debug flags:
GST_DEBUG=3
G_MESSAGES_DEBUG=all
package robolive.bindings;

import org.freedesktop.gstreamer.Element;
import org.freedesktop.gstreamer.GstObject;
import org.freedesktop.gstreamer.lowlevel.GstAPI;

import java.util.logging.Logger;

public class GstWebRTCDataChannel extends GstObject {
    public static final String GTYPE_NAME = "GstWebRTCDataChannel";
    private static Logger LOG = Logger.getLogger(GstWebRTCDataChannel.class.getName());
    protected GstWebRTCDataChannel(Initializer init) {
        super(init);
    }

    GstWebRTCDataChannel(Handle handle, boolean needRef) {
        super(handle, needRef);
    }

    public static interface ON_MESSAGE_STRING {
        public void onMessageString(String message);
    }

    public void connect(final ON_MESSAGE_STRING listener) {
        LOG.fine("SOMETHING SOMETHING");
        connect(ON_MESSAGE_STRING.class, listener, new GstAPI.GstCallback() {
            @SuppressWarnings("unused")
            public void callback(Element elem, String message) {
                listener.onMessageString(message);
            }
        });
    }
}

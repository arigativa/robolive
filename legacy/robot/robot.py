import asyncio
import json
import logging
import os
import sys

import gi
import websockets

gi.require_version('GLib', '2.0')
gi.require_version('Gst', '1.0')
gi.require_version('GstApp', '1.0')
gi.require_version('GstSdp', '1.0')
gi.require_version('GstWebRTC', '1.0')

from gi.repository.Gst import Pad, Caps, CapsFeatures, Structure
from gi.repository import Gst
from gi.repository import GstWebRTC
from gi.repository import GstSdp

PIPELINE_DESC = '''
webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
 videotestsrc is-live=true pattern=ball ! videoconvert ! queue ! vp8enc deadline=1 ! rtpvp8pay !
 queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
 audiotestsrc is-live=true wave=red-noise ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
 queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.
'''


class WebRTCClient:
    def __init__(self, server, logger):
        self.connected = False
        self.conn = None
        self.pipe: Gst.Pipeline = None
        self.webrtc = None
        self.server = server
        self.logger = logger

    async def connect(self):
        # TODO: SSL
        self.conn = await websockets.connect(self.server)

    def on_offer_created(self, promise, _, __):
        promise.wait()
        reply = promise.get_reply()
        offer = reply.get_value('offer')
        promise = Gst.Promise.new()
        self.logger.info('on_offer_reply')
        self.webrtc.emit('set-local-description', offer, promise)
        promise.interrupt()
        self.send_sdp_offer(offer)

    def send_sdp_offer(self, offer):
        text = offer.sdp.as_text()
        self.logger.info('Sending offer:\n%s' % text)
        msg = json.dumps({'sdp': {'type': 'offer', 'sdp': text}})
        loop = asyncio.new_event_loop()
        loop.run_until_complete(self.conn.send(msg))

    def on_negotiation_needed(self, element):
        self.logger.info('on_negotiation_needed')
        promise = Gst.Promise.new_with_change_func(self.on_offer_created, element, None)
        element.emit('create-offer', None, promise)

    def send_ice_candidate_message(self, _, mlineindex, candidate):
        icemsg = json.dumps({'ice': {'candidate': candidate, 'sdpMLineIndex': mlineindex}})
        loop = asyncio.new_event_loop()
        loop.run_until_complete(self.conn.send(icemsg))

    def on_incoming_decodebin_stream(self, _, pad: Pad):
        if not pad.has_current_caps():
            print (pad, 'has no caps, ignoring')
            return

        caps: Caps = pad.get_current_caps()
        assert (caps.get_size() > 0)
        s: Structure = caps.get_structure(0)
        name = s.get_name()
        if name.startswith('video'):
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('videoconvert')
            sink = Gst.ElementFactory.make('autovideosink')
            self.pipe.add(q)
            self.pipe.add(conv)
            self.pipe.add(sink)
            self.pipe.sync_children_states()
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(sink)
        elif name.startswith('audio'):
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('audioconvert')
            resample = Gst.ElementFactory.make('audioresample')
            sink = Gst.ElementFactory.make('autoaudiosink')
            self.pipe.add(q)
            self.pipe.add(conv)
            self.pipe.add(resample)
            self.pipe.add(sink)
            self.pipe.sync_children_states()
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(resample)
            resample.link(sink)

    def on_incoming_stream(self, _, pad):
        if pad.direction != Gst.PadDirection.SRC:
            return

        decodebin = Gst.ElementFactory.make('decodebin')
        decodebin.connect('pad-added', self.on_incoming_decodebin_stream)
        self.pipe.add(decodebin)
        decodebin.sync_state_with_parent()
        self.webrtc.link(decodebin)

    def start_pipeline(self):
        self.logger.info('Start negotiation')
        self.pipe = Gst.parse_launch(PIPELINE_DESC)
        self.webrtc = self.pipe.get_by_name('sendrecv')
        print("BEFORE READY")
        self.pipe.set_state(Gst.State.READY)
        self.webrtc.connect('on-negotiation-needed', self.on_negotiation_needed)
        self.webrtc.connect('on-ice-candidate', self.send_ice_candidate_message)
        self.webrtc.connect('on-data-channel', self.on_data_channel)
        self.webrtc.connect('pad-added', self.on_incoming_stream)
        chan = self.webrtc.emit('create-data-channel', 'server-chan', None)
        self.on_data_channel(self.pipe, chan)
        print("BEFORE PLAYING")
        self.pipe.set_state(Gst.State.PLAYING)

    def on_data_channel(self, webrtc, channel):
        print('data_channel created')
        channel.connect('on-error', self.on_data_channel_error)
        channel.connect('on-open', self.on_data_channel_open)
        channel.connect('on-close', self.on_data_channel_close)
        channel.connect('on-message-string', self.on_data_channel_message)

    def on_data_channel_error(self, channel):
        print('data_channel error')

    def on_data_channel_open(self, channel):
        print('data_channel opened')

    def on_data_channel_close(self, channel):
        print('data_channel closed')

    def on_data_channel_message(self, channel, msg_raw):
        print('data_channel message:', msg_raw)
        channel.emit('send-string', f'You said "{msg_raw}"')

    async def handle_sdp(self, message):
        assert self.webrtc
        msg = json.loads(message)
        self.logger.info('ROBOT RECV: %s' % msg)
        if 'sdp' in msg:
            sdp = msg['sdp']
            assert(sdp['type'] == 'answer')
            sdp = sdp['sdp']
            self.logger.info('Received answer:\n%s' % sdp)
            res, sdpmsg = GstSdp.SDPMessage.new()
            GstSdp.sdp_message_parse_buffer(bytes(sdp.encode()), sdpmsg)
            answer = GstWebRTC.WebRTCSessionDescription.new(GstWebRTC.WebRTCSDPType.ANSWER, sdpmsg)
            promise = Gst.Promise.new()
            self.webrtc.emit('set-remote-description', answer, promise)
            promise.interrupt()
        elif 'ice' in msg:
            ice = msg['ice']
            self.logger.info(ice)
            candidate = ice['candidate']
            sdpmlineindex = ice['sdpMLineIndex']
            self.webrtc.emit('add-ice-candidate', sdpmlineindex, candidate)

    async def loop(self):
        assert self.conn
        if not self.connected:
            await self.connect_as_robot()
        async for message in self.conn:
            if message == 'READY':
                self.start_pipeline()
            elif message.startswith('ERROR'):
                self.logger.error(message)
                return 1
            else:
                await self.handle_sdp(message)
        return 0

    async def connect_as_robot(self):
        await self.conn.send('ROBOT')
        msg = await self.conn.recv()
        if msg == 'ROBOT_OK':
            self.connected = True
            return
        else:
            raise Exception('Can not connect to signaling')


def check_plugins():
    needed = ["opus", "vpx", "nice", "webrtc", "dtls", "srtp", "rtp",
              "rtpmanager", "videotestsrc", "audiotestsrc"]
    missing = list(filter(lambda p: Gst.Registry.get().find_plugin(p) is None, needed))
    if len(missing):
        print('Missing gstreamer plugins:', missing)
        return False
    return True


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    Gst.init(None)
    if not check_plugins():
        sys.exit(1)
    server = os.getenv('SERVER')
    print("Server: ", server)
    c = WebRTCClient(server, logging.getLogger(__name__))
    asyncio.get_event_loop().run_until_complete(c.connect())
    res = asyncio.get_event_loop().run_until_complete(c.loop())
    sys.exit(res)
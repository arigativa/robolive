import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';
import { debug } from 'jssip/lib/JsSIP'

debug.enable("JsSIP:*");

class Subs {
    private readonly unsubs: Array<() => void> = [];

    public subscribe<T>(
        port: undefined | ElmCmdPort<T>,
        listener: (value: T) => void
    ): void {
        port?.subscribe(listener);
        this.unsubs.push(() => port?.unsubscribe(listener));
    }

    public unsubscribeAll(): void {
        while (this.unsubs.length > 0) {
            const unsubscribe = this.unsubs.pop();

            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }
    }
}

interface RegisterOptions {
    web_socket_url: string,
    uri: string,
    register: boolean,
    username: string,
    password: null | string
}

interface IceServer {
    url: string;
    username: null | string;
    password: null | string;
}

interface CallOptions {
    user_agent: UA;
    uri: string;
    with_audio: boolean;
    with_video: boolean;
    ice_servers: Array<IceServer>;
}

export const register = (ports: {
    js_sip__register?: ElmCmdPort<RegisterOptions>;
    js_sip__on_registred_err?: ElmSubPort<string>;
    js_sip__on_registred_ok?: ElmSubPort<UA>;

    js_sip__call?: ElmCmdPort<CallOptions>;
    js_sip__on_call_failed?: ElmSubPort<string>;
    js_sip__on_call_confirmed?: ElmSubPort<MediaStream>;

    js_sip__send_info?: ElmCmdPort<string>;

    js_sip__hangup?: ElmCmdPort;

    js_sip__on_end?: ElmSubPort;
}): void => {
    ports.js_sip__register?.subscribe(options => {
        const uaConfig: UAConfiguration = {
            sockets: [
                new WebSocketInterface(options.web_socket_url)
            ],
            uri: options.uri,
            display_name: options.username,
            register: options.register
        };

        if (options.password !== null) {
            uaConfig.authorization_user = options.username;
            uaConfig.password = options.password;
        }

        const ua = new UA(uaConfig);

        ua.on('registrationFailed', ({ response }) => {
            ports.js_sip__on_registred_err?.send(response.reason_phrase)

            ua.stop();
        })

        ua.on('registered', () => {
            ports.js_sip__on_registred_ok?.send(ua);
        });

        ua.start();
    });

    const onJsSipCall = (options: CallOptions): void => {
        const subs = new Subs();
        const session = options.user_agent.call(
            options.uri,
            {
                mediaConstraints: {
                    audio: options.with_audio,
                    video: options.with_video
                },
                pcConfig: {
                    rtcpMuxPolicy: 'negotiate',
                    iceServers: options.ice_servers.map(({ url, username, password }): RTCIceServer => {
                        if (username == null || password == null || username.length === 0 || password.length === 0) {
                            return {
                                urls: url
                            };
                        }

                        return {
                            urls: url,
                            username,
                            credential: password,
                            credentialType: 'password'
                        }
                    })
                }
            }
        );

        function logCall(functionName) {
            return function () {
                console.log.apply(console, [functionName, ...arguments]);
            };
        }

        session.on('peerconnection', logCall('peerconnection'))
        session.on('sending', logCall('sending'))
        session.on('progress', logCall('progress'))
        session.on('accepted', logCall('accepted'))
        session.on('confirmed', logCall('confirmed'))
        session.on('newDTMF', logCall('newDTMF'))
        session.on('newInfo', logCall('newInfo'))
        session.on('hold', logCall('hold'))
        session.on('unhold', logCall('unhold'))
        session.on('muted', logCall('muted'))
        session.on('unmuted', logCall('unmuted'))
        session.on('reinvite', logCall('reinvite'))
        session.on('update', logCall('update'))
        session.on('refer', logCall('refer'))
        session.on('replaces', logCall('replaces'))
        session.on('sdp', logCall('sdp'))
        session.on('icecandidate', logCall('icecandidate'))
        session.on('getusermediafailed', logCall('getusermediafailed'))
        session.on('peerconnection:createofferfailed', logCall('peerconnection:createofferfailed'))
        session.on('peerconnection:createanswerfailed', logCall('peerconnection:createanswerfailed'))
        session.on('peerconnection:setlocaldescriptionfailed', logCall('peerconnection:setlocaldescriptionfailed'))
        session.on('peerconnection:setremotedescriptionfailed', logCall('peerconnection:setremotedescriptionfailed'))

        session.on('failed', event => ports.js_sip__on_call_failed?.send(event.cause));

        session.on('confirmed', () => {
            const remoteStreams = session.connection.getRemoteStreams();

            if (remoteStreams.length > 0) {
                ports.js_sip__on_call_confirmed?.send(remoteStreams[ 0 ].clone());
            }

            subs.subscribe(
                ports.js_sip__send_info,
                json => session.sendInfo('application/json', json)
            );

            subs.subscribe(
                ports.js_sip__hangup,
                () => session.terminate()
            );
        });

        session.on('ended', () => {
            ports.js_sip__on_end?.send(null);
            subs.unsubscribeAll();
        });
    }

    ports.js_sip__call?.subscribe(options => {
        try {
            onJsSipCall(options)
        } catch (error) {
            const { message = 'Unknown error' }: Error = error;

            ports.js_sip__on_call_failed?.send(message);
        }
    });
};

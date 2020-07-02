import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';
import { debug } from 'jssip/lib/JsSIP'

debug.disable();

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

        session.on('peerconnection', () => console.log('peerconnection'))
        session.on('sending', () => console.log('sending'))
        session.on('progress', () => console.log('progress'))
        session.on('accepted', () => console.log('accepted'))
        session.on('confirmed', () => console.log('confirmed'))
        session.on('newDTMF', () => console.log('newDTMF'))
        session.on('newInfo', () => console.log('newInfo'))
        session.on('hold', () => console.log('hold'))
        session.on('unhold', () => console.log('unhold'))
        session.on('muted', () => console.log('muted'))
        session.on('unmuted', () => console.log('unmuted'))
        session.on('reinvite', () => console.log('reinvite'))
        session.on('update', () => console.log('update'))
        session.on('refer', () => console.log('refer'))
        session.on('replaces', () => console.log('replaces'))
        session.on('sdp', () => console.log('sdp'))
        session.on('icecandidate', () => console.log('icecandidate'))
        session.on('getusermediafailed', () => console.log('getusermediafailed'))
        session.on('peerconnection:createofferfailed', () => console.log('peerconnection:createofferfailed'))
        session.on('peerconnection:createanswerfailed', () => console.log('peerconnection:createanswerfailed'))
        session.on('peerconnection:setlocaldescriptionfailed', () => console.log('peerconnection:setlocaldescriptionfailed'))
        session.on('peerconnection:setremotedescriptionfailed', () => console.log('peerconnection:setremotedescriptionfailed'))

        session.on('failed', event => ports.js_sip__on_call_failed?.send(event.cause));

        session.on('confirmed', () => {
            const remoteStreams = session.connection.getRemoteStreams();

            if (remoteStreams.length > 0) {
                ports.js_sip__on_call_confirmed?.send(remoteStreams[ 0 ].clone());
            }

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

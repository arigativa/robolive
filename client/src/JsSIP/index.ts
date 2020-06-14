import { html, define, Hybrids } from 'hybrids';
import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';

const noop = () => {
    // do nothing
};

// W E B   C O M P O N E N T

interface WebRtcRemoteViewElement extends HTMLVideoElement {
    init: never;
    user_agent: UA;
    uri: string;
    with_audio: boolean;
    with_video: boolean;
    render(): HTMLElement;
}

const WebRtcRemoteViewElement: Hybrids<WebRtcRemoteViewElement> = {
    init: {
        connect: host => {
            const root = host.render();
            const remoteVideo = root.querySelector<HTMLVideoElement>('video');

            if (remoteVideo == null) {
                return noop;
            }

            const session = host.user_agent.call(
                host.uri,
                {
                    mediaConstraints: {
                        audio: host.with_audio,
                        video: host.with_video
                    },
                    pcConfig: {
                        rtcpMuxPolicy: 'negotiate'
                    }
                }
            );

            session.on('confirmed', () => {
                const remoteStreams = session.connection.getRemoteStreams();

                if (remoteStreams.length > 0) {
                    remoteVideo.srcObject = remoteStreams[ 0 ].clone()
                }
            });

            session.connection.addEventListener('addstream', event => {
                const { stream } = event as MediaStreamEvent

                remoteVideo.srcObject = stream
            });

            return () => {
                session.terminate();
            };
        }
    },

    render() {
        return html`
            <video autoplay></video>
        `;
    }
};

define('web-rtc-remote-view', WebRtcRemoteViewElement);

// P O R T S

interface RegisterOptions {
    web_socket_url: string,
    uri: string,
    register: boolean,
    username: string,
    password: null | string
}

interface RegisterError {
    code: number;
    reason: string;
}

export const register = (ports: {
    js_sip__register?: ElmCmdPort<RegisterOptions>;
    js_sip__on_registred_err?: ElmSubPort<RegisterError>;
    js_sip__on_registred_ok?: ElmSubPort<UA>;
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
            ports.js_sip__on_registred_err?.send({
                code: response.status_code,
                reason: response.reason_phrase
            })

            ua.stop();
        })

        ua.on('registered', () => {
            ports.js_sip__on_registred_ok?.send(ua);
        });

        ua.start();
    });
};

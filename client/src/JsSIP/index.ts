import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';
import { debug } from 'jssip/lib/JsSIP'

debug.disable();

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

interface CallOptions {
    user_agent: UA;
    uri: string;
    with_audio: boolean;
    with_video: boolean;
}

export const register = (ports: {
    js_sip__register?: ElmCmdPort<RegisterOptions>;
    js_sip__on_registred_err?: ElmSubPort<RegisterError>;
    js_sip__on_registred_ok?: ElmSubPort<UA>;

    js_sip__call?: ElmCmdPort<CallOptions>;
    js_sip__on_call_failed?: ElmSubPort<string>;
    js_sip__on_call_confirmed?: ElmSubPort<MediaStream>;

    js_sip__stop?: ElmCmdPort<UA>;
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

    ports.js_sip__call?.subscribe(options => {
        const session = options.user_agent.call(
            options.uri,
            {
                mediaConstraints: {
                    audio: options.with_audio,
                    video: options.with_video
                },
                pcConfig: {
                    rtcpMuxPolicy: 'negotiate'
                }
            }
        );

        session.on('peerconnection', () => console.log('peerconnection'))
        session.on('sending', () => console.log('sending'))
        session.on('progress', () => console.log('progress'))
        session.on('accepted', () => console.log('accepted'))
        session.on('confirmed', () => console.log('confirmed'))
        session.on('ended', () => console.log('ended'))
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
                ports.js_sip__on_call_confirmed?.send(remoteStreams[ 0 ].clone())
            }
        });
    });

    ports.js_sip__stop?.subscribe(userAgent => {
        userAgent.stop();
    });
};

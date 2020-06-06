import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';

interface CreatePhoneInstanceOptions {
    web_socket_url: string,
    uri: string,
    register: boolean,
    username: string,
    password: null | string
}

interface CreatePhoneInstanceError {
    code: number;
    reason: string;
}

export const register = (ports: {
    js_sip__register?: ElmCmdPort<CreatePhoneInstanceOptions>;
    js_sip__on_registred_err?: ElmSubPort<CreatePhoneInstanceError>;
    js_sip__on_registred_ok?: ElmSubPort<null>;
}): void => {
    ports.js_sip__register?.subscribe((options: CreatePhoneInstanceOptions): void => {
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
            ports.js_sip__on_registred_ok?.send(null);
        });

        ua.on('newRTCSession', () => {
            console.log('newRTCSession');
        });

        ua.start();
    });
};

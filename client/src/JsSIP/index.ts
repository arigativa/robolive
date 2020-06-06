import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';
import { UAConfiguration } from 'jssip/lib/UA';

interface CreatePhoneInstanceOptions {
    web_socket_url: string,
    uri: string,
    register: boolean,
    username: string,
    password: null | string
}

export const register = (ports: {
    js_sip__create_phone_instance?: ElmCmdPort<CreatePhoneInstanceOptions>;
}): void => {
    ports.js_sip__create_phone_instance?.subscribe((options: CreatePhoneInstanceOptions): void => {
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

        ua.on('registered', () => {
            console.log('registred');
        });

        ua.on('newMessage', () => {
            console.log('newMessage');
        });

        ua.on('newRTCSession', () => {
            console.log('newRTCSession');
        });

        ua.start();
    });
};

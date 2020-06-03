import { WebSocketInterface, UA } from 'jssip/lib/JsSIP';

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
        const ua = new UA({
            sockets: [
                new WebSocketInterface(options.web_socket_url)
            ],
            uri: options.uri,
            display_name: options.username,
            register: options.register,
            authorization_user: options.password == null ? undefined : options.username,
            password: options.password == null ? undefined : options.password
        });

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

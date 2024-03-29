import { Elm } from './Stories.elm';


const SETTINGS_KEY = 'bf_settings'

interface Ports {
    save_settings?: ElmCmdPort<string>;
}

const { ports }: { ports: Ports } = Elm.Stories.init({
    flags: localStorage.getItem(SETTINGS_KEY)
});

ports.save_settings?.subscribe(settings => localStorage.setItem(SETTINGS_KEY, settings))

import { Elm } from './src/Main.elm';
import { register as registerJsSIP } from './src/JsSIP/index';

const { ports } = Elm.Main.init();

registerJsSIP(ports);

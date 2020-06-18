/* eslint-disable init-declarations */

declare type Value
    = undefined
    | null
    | string
    | number
    | boolean
    | { [key: string]: Value }
    | Array<Value>
    ;

declare interface ElmCmdPort<T = Value> {
    subscribe(listener: (value: T) => void): void;
    unsubscribe(listener: (value: T) => void): void;
}

declare interface ElmSubPort<T = Value> {
    send(value?: T): void;
}

declare module "*.elm" {
    interface ElmApp {
        ports: { [key: string]: ElmCmdPort | ElmSubPort };
    }

    interface ElmModule {
        init(config?: {
            flags: Value;
        }): ElmApp;
    }

    export const Elm: { [module: string]: ElmModule };
}

declare module "*.jpg" {
    const image: string;

    export default image;
}

declare module "*.png" {
    const image: string;

    export default image;
}

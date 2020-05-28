declare module "*.elm" {
    type Value
        = undefined
        | null
        | string
        | number
        | boolean
        | { [key: string]: Value }
        | Array<Value>
        ;

    interface ElmInterop {
        send<T = Value>(value?: T): void;

        subscribe<T = Value>(listener: (value: T) => void): void;

        unsubscribe<T = Value>(listener: (value: T) => void): void;
    }

    interface ElmApp {
        ports: { [key: string]: ElmInterop };
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

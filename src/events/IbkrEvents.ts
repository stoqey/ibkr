import {EventEmitter} from 'events';

export class IbkrEvents extends EventEmitter {
    private static _instance: IbkrEvents;

    public static get Instance(): IbkrEvents {
        return this._instance || (this._instance = new this());
    }
}

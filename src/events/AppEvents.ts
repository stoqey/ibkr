import EventEmitter from 'events';

export class AppEvents extends EventEmitter {
    private static _instance: AppEvents;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}
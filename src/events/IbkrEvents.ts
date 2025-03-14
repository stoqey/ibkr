import { EventEmitter } from 'events';

export enum IBKREVENTS {

    /**
     * Historical Data Update
     */
    IBKR_BAR = 'IBKR_BAR',
    IBKR_CONNECTED = 'IBKR_CONNECTED',
    IBKR_SAVE_TRADE = 'IBKR_SAVE_TRADE',
}

export class IBKREvents extends EventEmitter.EventEmitter {
    private static _instance: IBKREvents;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super();
        this.setMaxListeners(0); // set a maximum of 50 event listners
    }
}

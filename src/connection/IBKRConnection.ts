import * as _ from 'lodash';

import {IBKREVENTS, IbkrEvents} from '../events';
import {IB_HOST, IB_PORT} from '../config';
import ibkr, {EventName} from '@stoqey/ib';

import AccountSummary from '../account/AccountSummary';
import {ConnectionStatus} from './connection.interfaces';
import Orders from '../orders/Orders';
import {Portfolios} from '../portfolios';
import includes from 'lodash/includes';
import {log} from '../log';
import {publishDataToTopic} from '../events/IbkrEvents.publisher';

const appEvents = IbkrEvents.Instance;

// This has to be unique per this execution
const clientId = _.random(100, 100000);

export interface IbkrInitOpt {
    portfolios?: boolean;
    orders?: boolean;
}

/**
 * Global IBKR connection
 * @singleton class
 */
export class IBKRConnection {
    public status: ConnectionStatus = null;
    public IB_PORT: number = IB_PORT;
    public IB_HOST: string = IB_HOST;
    private static _instance: IBKRConnection;

    public ib: ibkr;

    public opt: IbkrInitOpt = {
        portfolios: true,
        orders: true,
    };

    public static get Instance(): IBKRConnection {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    /**
     * init
     */
    public init = (host: string, port: number, opt?: Partial<IbkrInitOpt>): void => {
        // Add opts.
        if (opt) {
            this.opt = {
                ...this.opt,
                ...opt,
            };
        }

        if (!this.ib) {
            this.ib = new ibkr({
                // clientId,
                host,
                port,
            });

            // this.ib.setMaxListeners(0);
            this.listen();
        }
    };

    /**
     * initialiseDep
     * Call/Initialize Account summary -> Portfolios -> OpenOrders
     */
    public initialiseDep = async (): Promise<boolean> => {
        const {portfolios: watchPortfolios, orders: watchOrders} = this.opt;

        try {
            // 1. Account summary
            log('1. Account summary');
            const accountSummary = AccountSummary.Instance;
            accountSummary.init();
            await accountSummary.getAccountSummary();

            if (watchPortfolios) {
                // 2. Portfolios
                log('2. Portfolios');
                const portfolio = Portfolios.Instance;
                await portfolio.init();
                await portfolio.getPortfolios();
            }

            if (watchOrders) {
                log('3. Orders');
                const openOrders = Orders.Instance;
                await openOrders.init();
                await openOrders.getOpenOrders();
            }

            return true;
        } catch (error) {
            log('error initialising IBKR', error);
            return false;
        }
    };

    /**
     * On listen for IB connection
     */
    private listen = (): void => {
        const self: IBKRConnection = this;

        function disconnectApp() {
            publishDataToTopic({
                topic: IBKREVENTS.DISCONNECTED,
                data: {},
            });
            self.status = IBKREVENTS.DISCONNECTED;
            return log(IBKREVENTS.DISCONNECTED, `Error connecting client => ${clientId}`);
        }

        // Important listners
        this.ib.on(EventName.connected, function () {
            async function connectApp() {
                log(`.................................................................`);
                log(`...... Connected client ${clientId}, initialising services ......`);

                // initialise dependencies
                const connected = await self.initialiseDep();

                if (connected) {
                    publishDataToTopic({
                        topic: IBKREVENTS.CONNECTED,
                        data: {
                            connected: true,
                        },
                    });
                    self.status = IBKREVENTS.CONNECTED;
                    log(`...... Successfully running ${clientId}'s services ..`);
                    return log(`.....................................................`);
                }

                disconnectApp();
            }
            connectApp();
        });

        this.ib.on(EventName.error, function (err: any) {
            const message = err && err.message;

            log(IBKREVENTS.ERROR, `message=${err && err.message} code=${err && err.code}`);

            if (includes(message, 'ECONNREFUSED') || (err && err.code === 'ECONNREFUSED')) {
                return disconnectApp();
            }
        });

        this.ib.on(EventName.disconnected, function () {
            log(IBKREVENTS.DISCONNECTED, `${clientId} Connection disconnected error`);
            disconnectApp();
            process.exit(1);
        });

        // connect the IBKR
        this.ib.connect(clientId);

        // App events
        appEvents.on(IBKREVENTS.PING, () => {
            // If we have the status
            if (self.status) {
                // PONG the current status
                publishDataToTopic({
                    topic: self.status,
                    data: {},
                });
            }
        });
    };

    /**
     * getIBKR instance
     */
    public getIBKR = (): ibkr => {
        return this.ib;
    };

    /**
     * disconnectIBKR
     */
    public disconnectIBKR(): void {
        this.status = IBKREVENTS.DISCONNECTED;
        try {
            log(`IBKR Force shutdown ${clientId} 😴😴😴`);
            this.ib.disconnect();
        } catch (error) {
            log(IBKREVENTS.ERROR, error);
        }
    }
}
export default IBKRConnection;

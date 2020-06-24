import * as _ from 'lodash';
import ibkr from '@stoqey/ib';
import {IB_HOST, IB_PORT} from '../config';
import {publishDataToTopic} from '../events/IbkrEvents.publisher';
import {IBKREVENTS, IbkrEvents} from '../events';
import {ConnectionStatus} from './connection.interfaces';
import AccountSummary from '../account/AccountSummary';
import {Portfolios} from '../portfolios';
import Orders from '../orders/Orders';
import includes from 'lodash/includes';
import {log} from '../log';

const appEvents = IbkrEvents.Instance;

// This has to be unique per this execution
const clientId = _.random(100, 100000);

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

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    /**
     * init
     */
    public init = (host: string, port: number) => {
        if (!this.ib) {
            this.ib = new ibkr({
                clientId,
                host,
                port,
            });

            this.ib.setMaxListeners(0);
            this.listen();
        }
    };

    /**
     * initialiseDep
     * Call/Initialize Account summary -> Portfolios -> OpenOrders
     */
    public initialiseDep = async (): Promise<boolean> => {
        try {
            // 1. Account summary
            log('1. Account summary');
            const accountSummary = AccountSummary.Instance;
            accountSummary.init();
            await accountSummary.getAccountSummary();
            // 2. Portfolios
            log('2. Portfolios');
            const portfolio = Portfolios.Instance;
            await portfolio.init();
            await portfolio.getPortfolios();

            log('3. Orders');
            const openOrders = Orders.Instance;
            await openOrders.init();
            await openOrders.getOpenOrders();

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
        this.ib.on(IBKREVENTS.CONNECTED, function (err: Error) {
            async function connectApp() {
                if (err) {
                    return disconnectApp();
                }

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

        this.ib.on(IBKREVENTS.ERROR, function (err: any) {
            const message = err && err.message;

            log(IBKREVENTS.ERROR, err && err.message);

            if (includes(message, 'ECONNREFUSED') || (err && err.code === 'ECONNREFUSED')) {
                return disconnectApp();
            }
        });

        this.ib.on(IBKREVENTS.DISCONNECTED, function (err: Error) {
            log(IBKREVENTS.DISCONNECTED, `Connection disconnected => ${clientId}`);
            disconnectApp();
            process.exit(1);
        });

        // connect the IBKR
        this.ib.connect();

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

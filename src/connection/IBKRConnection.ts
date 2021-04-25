import * as _ from 'lodash';
import {BehaviorSubject} from 'rxjs';
import {IBApiNext as ibkr} from '@stoqey/ib';
import {IB_HOST, IB_PORT} from '../config';
import {publishDataToTopic} from '../events/IbkrEvents.publisher';
import {IBKREVENTS, IbkrEvents} from '../events';
import {ConnectionStatus} from './connection.interfaces';
// import AccountSummary from '../account/AccountSummary';
// import {Portfolios} from '../portfolios';
// import Orders from '../orders/Orders';
import includes from 'lodash/includes';
import {log} from '../log';

const appEvents = IbkrEvents.Instance;

// This has to be unique per this execution
const clientId = _.random(100, 100000);

/**
 
let currentUserSubject$ = new BehaviorSubject() < string > 'Eric';
let currentUser$ = currentUserSubject$.asObservable();
 */

/**
 * Global IBKR connection
 * @singleton class
 */
export class IBKRConnection {
    /**
     * @deprecated
     */
    public status: ConnectionStatus = null;

    /**
     * Connection status of the IbApp
     */
    connection: BehaviorSubject<ConnectionStatus>;

    public IB_PORT: number = IB_PORT;
    public IB_HOST: string = IB_HOST;
    private static _instance: IBKRConnection;

    public ib: ibkr;

    /**
     * @deprecated
     */
    public static get Instance(): IBKRConnection {
        return this._instance || (this._instance = new this());
    }

    /**
     * Get Static IBKR app
     * App is persisted across all calls
     */
    public static get app(): IBKRConnection {
        return this._instance || (this._instance = new this());
    }

    /**
     * Start IBApp now
     * @param host
     * @param port
     */
    public start = (host: string = IB_HOST, port: number = IB_PORT): void => {
        if (!this.ib) {
            this.connection = new BehaviorSubject(IBKREVENTS.DISCONNECTED);
            const logger = {
                /** Log an info message. */
                info: (tag: string, ...args: unknown[]) => log(tag, ...args),
                // /** Log a warning message. */
                warn: (tag: string, ...args: unknown[]) => log(tag, ...args),
                // /** Log an error message. */
                error: (tag: string, ...args: unknown[]) => log(tag, ...args),
                // /** Log a debug message. */
                debug: (tag: string, ...args: unknown[]) => log(tag, ...args),
            };

            this.ib = new ibkr({
                logger,
                host,
                port,
            });

            // this.ib.setMaxListeners(0);
            this.listen();
        }
    };

    private constructor() {}

    /**
     * @deprecated use start instead
     * init
     */
    public init = (host: string = IB_HOST, port: number = IB_PORT): void => this.start(host, port);

    /**
     * initialiseDep
     * Call/Initialize Account summary -> Portfolios -> OpenOrders
     */
    public initialiseDep = async (): Promise<boolean> => {
        try {
            // 1. Account summary
            // log('1. Account summary');
            // const accountSummary = AccountSummary.Instance;
            // accountSummary.init();
            // await accountSummary.getAccountSummary();
            // // 2. Portfolios
            // log('2. Portfolios');
            // const portfolio = Portfolios.Instance;
            // await portfolio.init();
            // await portfolio.getPortfolios();

            // log('3. Orders');
            // const openOrders = Orders.Instance;
            // await openOrders.init();
            // await openOrders.getOpenOrders();

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

        log(`......client ${clientId}, initialising services ......`);

        function disconnectApp() {
            publishDataToTopic({
                topic: IBKREVENTS.DISCONNECTED,
                data: {},
            });
            self.status = IBKREVENTS.DISCONNECTED;
            this.connection.next(IBKREVENTS.DISCONNECTED);
            return log(IBKREVENTS.DISCONNECTED, `Error connecting client => ${clientId}`);
        }

        this.ib.connectionState.subscribe({
            next: async (value: any) => {
                log(`................................................................. ${value}`);
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
                    this.connection.next(IBKREVENTS.CONNECTED);
                    log(`...... Successfully running ${clientId}'s services ..`);
                    return log(`.....................................................`);
                }
            },
            error: (err: any) => {
                const message = err && err.message;

                log(IBKREVENTS.ERROR, err && err.message);

                if (includes(message, 'ECONNREFUSED') || (err && err.code === 'ECONNREFUSED')) {
                    return disconnectApp();
                }
                process.exit(1);
            },
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

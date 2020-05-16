import * as _ from 'lodash';
import chalk from 'chalk';
import ibkr from '@stoqey/ib';
import { IB_HOST, IB_PORT } from '../config'
import { publishDataToTopic } from '../events/IbkrEvents.publisher';
import { IBKREVENTS, IbkrEvents } from '../events';
import { ConnectionStatus } from './connection.interfaces';
import AccountSummary from '../account/AccountSummary';
import { Portfolios } from '../portfolios';
import Orders from '../orders/Orders';
import includes from 'lodash/includes';

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

    private constructor() { }

    /**
     * init
     */
    public init = (host: string, port: number) => {

        if (!this.ib) {
            this.ib = new ibkr({
                clientId,
                host,
                port
            });

            this.listen();
        }
    }

    /**
     * initialiseDep
     * Call/Initialize Account summary -> Portfolios -> OpenOrders
     */
    public initialiseDep = async (): Promise<boolean> => {

        try {
            // 1. Account summary
            console.log('1. Account summary')
            const accountSummary = AccountSummary.Instance;
            accountSummary.init();
            await accountSummary.getAccountSummary();
            // 2. Portolios
            console.log('2. Portolios')
            const portfolio = Portfolios.Instance;
            await portfolio.init();
            await portfolio.getPortfolios();

            console.log('3. Orders');
            const openOrders = Orders.Instance;
            await openOrders.init();
            await openOrders.getOpenOrders();

            return true;

        }
        catch (error) {
            console.log('error initialising IBKR', error);
            return false;
        }

    }

    /**
     * On listen for IB connection
     */
    private listen = (): void => {

        const self: IBKRConnection = this;

        function disconnectApp() {
            publishDataToTopic({
                topic: IBKREVENTS.DISCONNECTED,
                data: {}
            });
            self.status = IBKREVENTS.DISCONNECTED;
            return console.error(IBKREVENTS.DISCONNECTED, chalk.red(`Error connecting client => ${clientId}`));
        }

        // Important listners
        this.ib.on(IBKREVENTS.CONNECTED, function (err: Error) {

            async function connectApp() {
                if (err) {
                    return disconnectApp();
                }

                console.log(chalk.blue(`.................................................................`));
                console.log(chalk.blue(`...... Connected client ${clientId}, initialising services ......`));

                // initialise dependencies
                const connected = await self.initialiseDep();

                if (connected) {
                    publishDataToTopic({
                        topic: IBKREVENTS.CONNECTED,
                        data: {
                            connected: true
                        }
                    });
                    self.status = IBKREVENTS.CONNECTED;
                    console.log(chalk.blue(`...... Successfully running ${clientId}'s services ..`));
                    return console.log(chalk.blue(`.....................................................`));
                }

                disconnectApp();


            }
            connectApp();

        })

        this.ib.on(IBKREVENTS.ERROR, function (err: any) {

            const message = err && err.message;

            console.log(IBKREVENTS.ERROR, chalk.red(err && err.message));

            if (includes(message, 'ECONNREFUSED') || err && err.code === 'ECONNREFUSED') {
                return disconnectApp()
            }
        })

        this.ib.on(IBKREVENTS.DISCONNECTED, function (err: Error) {
            console.log(IBKREVENTS.DISCONNECTED, chalk.red(`Connection disconnected => ${clientId}`));
            return disconnectApp();
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
                    data: {}
                });
            }

        })

    }

    /**
     * getIBKR instance
     */
    public getIBKR = (): ibkr => {
        return this.ib;
    }

    /**
     * disconnectIBKR
     */
    public disconnectIBKR(): void {
        this.status = IBKREVENTS.DISCONNECTED;
        try {
            console.log(chalk.keyword("orange")(`IBKR Force shutdown ${clientId} 😴😴😴`));
            this.ib.disconnect();
        }
        catch (error) {
            console.log(IBKREVENTS.ERROR, chalk.red(error))
        }

    }

}
export default IBKRConnection;
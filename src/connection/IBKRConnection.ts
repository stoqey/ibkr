import { Subscription } from "rxjs";
import { IBApiNextCreationOptions, IBApiNext, ConnectionState } from "@stoqey/ib"
import { log } from "../utils/log";
import Portfolios from "../portfolios/Portfolios";
import Orders from "../orders/Orders";
import MarketDataManager from "../marketdata/MarketDataManager";
import { IBKREvents, IBKREVENTS } from "../events";
import { AccountSummary } from "../account/AccountSummary";

const ibkrEvents = IBKREvents.Instance;

export class IBKRConnection {

    private ibApiNext: IBApiNext;

    connected: boolean = false;
    private connection: Subscription;
    private errors: Subscription;
    private connectionState: ConnectionState;

    private static _instance: IBKRConnection;

    public static get Instance(): IBKRConnection {
        return this._instance || (this._instance = new this());
    }

    constructor() { }

    get ib(): IBApiNext {
        return this.ibApiNext;
    };

    /**
     * initializeDep
     * Call/Initialize Account summary -> Portfolios -> OpenOrders
     */
    public initializeDep = async (): Promise<boolean> => {
        try {
            // 1. Account summary
            log('1. Account summary');
            const accountSummary = AccountSummary.Instance;
            accountSummary.init();
            await accountSummary.getAccountSummaryUpdates();
            // 2. Market data
            log('2. Market data');
            const marketData = MarketDataManager.Instance;
            await marketData.init();
            // 3. Portfolios
            log('3. Portfolios');
            const portfolio = Portfolios.Instance;
            await portfolio.init();
            await portfolio.asyncPortfolios();
            // 4. Orders
            log('3. Orders');
            const openOrders = Orders.Instance;
            await openOrders.init();
            await openOrders.asyncOpenOrders();

            return true;
        } catch (error) {
            log('error initialising IBKR', error);
            return false;
        }
    };



    public init(opt?: Partial<IBApiNextCreationOptions>): Promise<boolean> {
            if (this.connected || this.ibApiNext) {
                log('already init');
                return Promise.resolve(true);
            }
            if (opt) {
                if (!opt.reconnectInterval) opt.reconnectInterval = 1000;
                if (!opt.connectionWatchdogInterval) opt.connectionWatchdogInterval = 1;
                log('init with options', opt);
                this.ibApiNext = new IBApiNext(opt);
            } else {
                opt = {};
                // reconnect interval from env
                opt.reconnectInterval = parseInt(process.env.IBKR_RECONNECT_INTERVAL) || 1000;
                opt.connectionWatchdogInterval = parseInt(process.env.IBKR_WATCHDOG_INTERVAL) || 1;

                // port and host from env
                opt.host = process.env.IBKR_HOST || '127.0.0.1';
                opt.port = parseInt(process.env.IBKR_PORT) || 7497;
                log('init with env', opt);
                this.ibApiNext = new IBApiNext(opt);
            }

            this.ibApiNext.logLevel = 5;

            return this.connect();
    }

    async connect(clientId: number = 0): Promise<boolean> {

        if (process.env.IBKR_CLIENT_ID) {
            clientId = parseInt(process.env.IBKR_CLIENT_ID);
        }

        // connect to IBKR
        if (this.connected) {
            await this.initializeDep();
        }

        this.errors = this.ibApiNext.errorSubject.subscribe((error: any) => {
            log('IBKRConnection.ibApiNext.errors', error.message);
        });

        this.ibApiNext.connectionState.subscribe((state) => {
            log('connection state', state);
            switch (state) {
                case ConnectionState.Connecting:
                    this.connectionState = state;
                    log('connecting to ibkr');
                    break;
                case ConnectionState.Connected:
                    this.connectionState = state;
                    this.connected = true;
                    log('connected to ibkr');
                    return true;
                case ConnectionState.Disconnected:
                    log('disconnected from ibkr', this.connectionState);
                    this.connected = false;
                    if (this.connectionState === ConnectionState.Connecting) {
                        this.connectionState = state;
                        // if was connecting, then reject
                        return false;
                    }
                    break;
                default:
                    break;
            }

            if (!this.connection) {
                this.connection = this.ibApiNext.connectionState.subscribe((state) => {
                    log('connection state', state);
                    switch (state) {
                        case ConnectionState.Connecting:
                            this.connectionState = state;
                            log('connecting to ibkr');
                            break;
                        case ConnectionState.Connected:
                            this.connectionState = state;
                            this.connected = true;
                            this.initializeDep();
                            ibkrEvents.emit(IBKREVENTS.IBKR_CONNECTED);
                            log('connected to ibkr');
                            break;
                        case ConnectionState.Disconnected:
                            log('disconnected from ibkr', this.connectionState);
                            this.connected = false;

                            // TODO disconnect
                            if (this.connectionState === ConnectionState.Connecting) {
                                this.connectionState = state;
                            }

                            if (this.connectionState === ConnectionState.Disconnected) {
                                // process.exit(0);
                                console.log('ConnectionState.Disconnected', ConnectionState.Disconnected);
                            }

                            break;
                        default:
                            break;
                    }
                });
            }


            this.ibApiNext.connect(clientId);

        });

        return true;
    }

    disconnect() {
        // TODO others....
        if (this.connection) {
            this.connection.unsubscribe();
        }
    }
}

export default IBKRConnection;
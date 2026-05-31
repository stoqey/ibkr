import { Subscription } from "rxjs";
import { IBApiNextCreationOptions, IBApiNext, ConnectionState } from "@stoqey/ib"
import { log } from "../utils/log";
import Portfolios from "../portfolios/Portfolios";
import Orders from "../orders/Orders";
import MarketDataManager from "../marketdata/MarketDataManager";
import { IBKREvents, IBKREVENTS } from "../events";
import { AccountSummary } from "../account/AccountSummary";

const ibkrEvents = IBKREvents.Instance;
const MIN_RECONNECT_INTERVAL_MS = 1000;

const isEnabledEnvValue = (value?: string): boolean => {
    const normalized = `${value || ""}`.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const isMarketDataOnly = (env: Record<string, string | undefined> = process.env): boolean => {
    return isEnabledEnvValue(env.MD_ONLY) || isEnabledEnvValue(env.IBKR_MD_ONLY);
};

export const normalizeReconnectInterval = (reconnectInterval?: number): number => {
    if (!reconnectInterval || !Number.isFinite(reconnectInterval)) {
        return MIN_RECONNECT_INTERVAL_MS;
    }

    return Math.max(reconnectInterval, MIN_RECONNECT_INTERVAL_MS);
};

export class IBKRConnection {

    private ibApiNext: IBApiNext;

    connected: boolean = false;
    private connection?: Subscription;
    private errors?: Subscription;
    private connectionState?: ConnectionState;
    private reconnectLoop?: NodeJS.Timeout;
    private reconnectClientId: number = 0;
    private reconnectIntervalMs?: number;
    private shouldReconnect: boolean = false;

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
            const marketDataOnly = isMarketDataOnly();

            if (!marketDataOnly) {
                // 1. Account summary
                log('1. Account summary');
                const accountSummary = AccountSummary.Instance;
                accountSummary.init();
                await accountSummary.getAccountSummaryUpdates();
            } else {
                log('MD_ONLY enabled, skipping account summary');
            }

            // Market data is always initialized.
            log('2. Market data');
            const marketData = MarketDataManager.Instance;
            await marketData.init();

            if (!marketDataOnly) {
                // 3. Portfolios
                log('3. Portfolios');
                const portfolio = Portfolios.Instance;
                await portfolio.init();
                await portfolio.asyncPortfolios();
                // 4. Orders
                log('4. Orders');
                const openOrders = Orders.Instance;
                await openOrders.init();
                await openOrders.asyncOpenOrders();
            } else {
                log('MD_ONLY enabled, skipping portfolios and orders');
            }

            return true;
        } catch (error) {
            log('error initialising IBKR', error);
            return false;
        }
    };



    public init(opt?: Partial<IBApiNextCreationOptions>): Promise<boolean> {
            if (this.connected || this.ibApiNext) {
                log('already init');
                if (!this.connected) {
                    this.shouldReconnect = true;
                    this.startReconnectLoop();
                }
                return Promise.resolve(this.connected);
            }
            if (opt) {
                opt.reconnectInterval = normalizeReconnectInterval(opt.reconnectInterval);
                if (!opt.connectionWatchdogInterval) opt.connectionWatchdogInterval = 1;
                this.reconnectIntervalMs = opt.reconnectInterval;
                log('init with options', opt);
                this.ibApiNext = new IBApiNext(opt);
            } else {
                opt = {};
                // reconnect interval from env
                opt.reconnectInterval = normalizeReconnectInterval(parseInt(process.env.IBKR_RECONNECT_INTERVAL));
                opt.connectionWatchdogInterval = parseInt(process.env.IBKR_WATCHDOG_INTERVAL) || 1;
                this.reconnectIntervalMs = opt.reconnectInterval;

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
        };

        this.reconnectClientId = clientId;
        this.shouldReconnect = true;
        this.startReconnectLoop();

        return new Promise((resolve) => {
            // connect to IBKR
            if (this.connected) {
                this.initializeDep();
                resolve(true);
                return;
            }
            if (!this.errors) {
                this.errors = this.ibApiNext.errorSubject.subscribe((error: any) => {
                    log("IBKRConnection.ibApiNext.errors", error.message)
                })
            }

            let settled = false;
            let startupConnectionState: ConnectionState | undefined;
            let startupConnection: Subscription | undefined;
            let unsubscribeStartupAfterSubscribe = false;
            const finish = (started: boolean) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (startupConnection) {
                    startupConnection.unsubscribe();
                } else {
                    unsubscribeStartupAfterSubscribe = true;
                }
                resolve(started);
            };

            startupConnection = this.ibApiNext.connectionState.subscribe((state) => {
                log('connection state', state);
                switch (state) {
                    case ConnectionState.Connecting:
                        startupConnectionState = state;
                        log('connecting to ibkr');
                        break;
                    case ConnectionState.Connected:
                        this.connected = true;
                        log('connected to ibkr');
                        finish(true);
                        break;
                    case ConnectionState.Disconnected:
                        log('disconnected from ibkr', startupConnectionState);
                        this.connected = false;
                        if (startupConnectionState === ConnectionState.Connecting) {
                            startupConnectionState = state;
                            // if was connecting, then reject
                            this.startReconnectLoop();
                            finish(false);
                        }
                        break;
                    default:
                        break;
                }
            });
            if (unsubscribeStartupAfterSubscribe) {
                startupConnection.unsubscribe();
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
                            this.stopReconnectLoop();
                            this.initializeDep();
                            ibkrEvents.emit(IBKREVENTS.IBKR_CONNECTED);
                            log('connected to ibkr');
                            break;
                        case ConnectionState.Disconnected:
                            log('disconnected from ibkr', this.connectionState);
                            this.connected = false;
                            this.startReconnectLoop();

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

    }

    disconnect() {
        // TODO others....
        this.shouldReconnect = false;
        this.stopReconnectLoop();
        if (this.connection) {
            this.connection.unsubscribe();
            this.connection = undefined;
        }
        if (this.errors) {
            this.errors.unsubscribe();
            this.errors = undefined;
        }
        this.ibApiNext?.disconnect();
        this.connected = false;
    }

    private startReconnectLoop(): void {
        if (!this.shouldReconnect || this.connected || this.reconnectLoop || !this.ibApiNext) {
            return;
        }

        const reconnectInterval = normalizeReconnectInterval(
            this.reconnectIntervalMs ?? parseInt(process.env.IBKR_RECONNECT_INTERVAL),
        );

        this.reconnectLoop = setInterval(() => {
            if (!this.shouldReconnect || this.connected || !this.ibApiNext) {
                return;
            }

            log('reconnecting to ibkr');
            this.ibApiNext.connect(this.reconnectClientId);
        }, reconnectInterval);
    }

    private stopReconnectLoop(): void {
        if (!this.reconnectLoop) {
            return;
        }

        clearInterval(this.reconnectLoop);
        this.reconnectLoop = undefined;
    }
}

export default IBKRConnection;

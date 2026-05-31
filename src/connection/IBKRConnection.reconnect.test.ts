import "mocha";
import { expect } from "chai";
import { ConnectionState } from "@stoqey/ib";
import { IBKRConnection, normalizeReconnectInterval } from "./IBKRConnection";
import { AccountSummary } from "../account/AccountSummary";
import MarketDataManager from "../marketdata/MarketDataManager";
import Portfolios from "../portfolios/Portfolios";
import Orders from "../orders/Orders";

describe("IBKRConnection reconnect loop", () => {
    const originalReconnectInterval = process.env.IBKR_RECONNECT_INTERVAL;
    const originalClientId = process.env.IBKR_CLIENT_ID;

    afterEach(() => {
        restoreEnv("IBKR_RECONNECT_INTERVAL", originalReconnectInterval);
        restoreEnv("IBKR_CLIENT_ID", originalClientId);
    });

    it("should keep retrying when startup connection fails", async () => {
        process.env.IBKR_RECONNECT_INTERVAL = "5";
        delete process.env.IBKR_CLIENT_ID;

        const originalSetInterval = global.setInterval;
        const originalClearInterval = global.clearInterval;
        const intervalDelays: number[] = [];
        let intervalCallback: (() => void) | undefined;
        const connectionState = createConnectionState();
        const connectClientIds: Array<number | undefined> = [];
        const connection = new IBKRConnection();
        (connection as any).ibApiNext = {
            errorSubject: {
                subscribe: () => ({ unsubscribe: () => undefined }),
            },
            connectionState,
            connect: (clientId?: number) => {
                connectClientIds.push(clientId);
            },
            disconnect: () => undefined,
        };

        try {
            (global as any).setInterval = (callback: () => void, delay: number) => {
                intervalCallback = callback;
                intervalDelays.push(delay);
                return 1;
            };
            (global as any).clearInterval = () => undefined;

            const started = connection.connect(321);
            connectionState.emit(ConnectionState.Connecting);
            connectionState.emit(ConnectionState.Disconnected);

            expect(await started).to.equal(false);
            expect(intervalDelays).to.deep.equal([1000]);
            expect(intervalCallback).to.not.equal(undefined);

            intervalCallback?.();
            intervalCallback?.();

            expect(connectClientIds).to.deep.equal([321, 321, 321]);
        } finally {
            connection.disconnect();
            global.setInterval = originalSetInterval;
            global.clearInterval = originalClearInterval;
        }
    });

    it("should use one second as the minimum reconnect interval", () => {
        expect(normalizeReconnectInterval(5)).to.equal(1000);
        expect(normalizeReconnectInterval(999)).to.equal(1000);
        expect(normalizeReconnectInterval(1001)).to.equal(1001);
    });

    it("should not duplicate account summary subscriptions when dependencies reinitialize", () => {
        const accountSummary = AccountSummary.Instance as any;
        const originalIb = accountSummary.ib;
        const originalSubscription = accountSummary.GetAccountSummaryUpdates;
        let subscribeCalls = 0;

        accountSummary.ib = {
            getAccountSummary: () => createObservable(() => {
                subscribeCalls += 1;
            }),
        };
        accountSummary.GetAccountSummaryUpdates = undefined;

        try {
            accountSummary.getAccountSummaryUpdates();
            accountSummary.getAccountSummaryUpdates();

            expect(subscribeCalls).to.equal(1);
        } finally {
            accountSummary.GetAccountSummaryUpdates?.unsubscribe();
            accountSummary.GetAccountSummaryUpdates = originalSubscription;
            accountSummary.ib = originalIb;
        }
    });

    it("should not duplicate position subscriptions when dependencies reinitialize", () => {
        const portfolios = Portfolios.Instance as any;
        const marketData = MarketDataManager.Instance as any;
        const originalIb = portfolios.ib;
        const originalSubscription = portfolios.GetPositions;
        const originalMarketDataInit = marketData.init;
        let subscribeCalls = 0;

        portfolios.ib = {
            getPositions: () => createObservable(() => {
                subscribeCalls += 1;
            }),
        };
        portfolios.GetPositions = undefined;
        marketData.init = () => undefined;

        try {
            portfolios.syncPortfolios();
            portfolios.syncPortfolios();

            expect(subscribeCalls).to.equal(1);
        } finally {
            portfolios.GetPositions?.unsubscribe();
            portfolios.GetPositions = originalSubscription;
            portfolios.ib = originalIb;
            marketData.init = originalMarketDataInit;
        }
    });

    it("should not duplicate open order subscriptions when dependencies reinitialize", () => {
        const orders = Orders.Instance as any;
        const portfolios = Portfolios.Instance as any;
        const originalIb = orders.ib;
        const originalSubscription = orders.GetOrders;
        const originalPortfolioInit = portfolios.init;
        let subscribeCalls = 0;

        orders.ib = {
            getAutoOpenOrders: () => createObservable(() => {
                subscribeCalls += 1;
            }),
        };
        orders.GetOrders = undefined;
        portfolios.init = () => undefined;

        try {
            orders.syncOpenOrders();
            orders.syncOpenOrders();

            expect(subscribeCalls).to.equal(1);
        } finally {
            orders.GetOrders?.unsubscribe();
            orders.GetOrders = originalSubscription;
            orders.ib = originalIb;
            portfolios.init = originalPortfolioInit;
        }
    });
});

function createConnectionState(): {
    subscribe: (listener: (state: ConnectionState) => void) => { unsubscribe: () => void };
    emit: (state: ConnectionState) => void;
} {
    let currentState = ConnectionState.Disconnected;
    const listeners = new Set<(state: ConnectionState) => void>();

    return {
        subscribe: (listener) => {
            listeners.add(listener);
            listener(currentState);
            return {
                unsubscribe: () => {
                    listeners.delete(listener);
                },
            };
        },
        emit: (state) => {
            currentState = state;
            for (const listener of Array.from(listeners)) {
                listener(state);
            }
        },
    };
}

function restoreEnv(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}

function createObservable(onSubscribe: () => void): {
    pipe: (...args: unknown[]) => { subscribe: (listener: (value: unknown) => void) => { closed: boolean; unsubscribe: () => void } };
    subscribe: (listener: (value: unknown) => void) => { closed: boolean; unsubscribe: () => void };
} {
    const observable = {
        pipe: () => observable,
        subscribe: () => {
            onSubscribe();
            return createSubscription();
        },
    };

    return observable;
}

function createSubscription(): { closed: boolean; unsubscribe: () => void } {
    return {
        closed: false,
        unsubscribe() {
            this.closed = true;
        },
    };
}

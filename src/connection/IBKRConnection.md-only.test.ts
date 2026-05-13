import "mocha";
import { expect } from "chai";
import { IBKRConnection, isMarketDataOnly } from "./IBKRConnection";
import { AccountSummary } from "../account/AccountSummary";
import MarketDataManager from "../marketdata/MarketDataManager";
import Portfolios from "../portfolios/Portfolios";
import Orders from "../orders/Orders";

describe("IBKRConnection MD_ONLY", () => {
    const originalMdOnly = process.env.MD_ONLY;
    const originalIbkrMdOnly = process.env.IBKR_MD_ONLY;

    afterEach(() => {
        if (originalMdOnly === undefined) {
            delete process.env.MD_ONLY;
        } else {
            process.env.MD_ONLY = originalMdOnly;
        }

        if (originalIbkrMdOnly === undefined) {
            delete process.env.IBKR_MD_ONLY;
        } else {
            process.env.IBKR_MD_ONLY = originalIbkrMdOnly;
        }
    });

    it("should detect market-data-only mode when either env flag is enabled", () => {
        expect(isMarketDataOnly({ MD_ONLY: "true" })).to.equal(true);
        expect(isMarketDataOnly({ IBKR_MD_ONLY: "1" })).to.equal(true);
        expect(isMarketDataOnly({ MD_ONLY: "false", IBKR_MD_ONLY: "false" })).to.equal(false);
    });

    it("should initialize only market data dependencies when MD_ONLY is enabled", async () => {
        const accountSummary = AccountSummary.Instance as any;
        const marketData = MarketDataManager.Instance as any;
        const portfolios = Portfolios.Instance as any;
        const orders = Orders.Instance as any;

        const originalAccountInit = accountSummary.init;
        const originalAccountUpdates = accountSummary.getAccountSummaryUpdates;
        const originalMarketDataInit = marketData.init;
        const originalPortfolioInit = portfolios.init;
        const originalAsyncPortfolios = portfolios.asyncPortfolios;
        const originalOrdersInit = orders.init;
        const originalAsyncOpenOrders = orders.asyncOpenOrders;

        const calls = {
            accountInit: 0,
            accountUpdates: 0,
            marketDataInit: 0,
            portfolioInit: 0,
            asyncPortfolios: 0,
            ordersInit: 0,
            asyncOpenOrders: 0,
        };

        process.env.MD_ONLY = "true";

        accountSummary.init = () => {
            calls.accountInit += 1;
        };
        accountSummary.getAccountSummaryUpdates = async () => {
            calls.accountUpdates += 1;
        };
        marketData.init = async () => {
            calls.marketDataInit += 1;
        };
        portfolios.init = async () => {
            calls.portfolioInit += 1;
        };
        portfolios.asyncPortfolios = async () => {
            calls.asyncPortfolios += 1;
        };
        orders.init = async () => {
            calls.ordersInit += 1;
        };
        orders.asyncOpenOrders = async () => {
            calls.asyncOpenOrders += 1;
        };

        try {
            const initialized = await IBKRConnection.Instance.initializeDep();

            expect(initialized).to.equal(true);
            expect(calls).to.deep.equal({
                accountInit: 0,
                accountUpdates: 0,
                marketDataInit: 1,
                portfolioInit: 0,
                asyncPortfolios: 0,
                ordersInit: 0,
                asyncOpenOrders: 0,
            });
        } finally {
            accountSummary.init = originalAccountInit;
            accountSummary.getAccountSummaryUpdates = originalAccountUpdates;
            marketData.init = originalMarketDataInit;
            portfolios.init = originalPortfolioInit;
            portfolios.asyncPortfolios = originalAsyncPortfolios;
            orders.init = originalOrdersInit;
            orders.asyncOpenOrders = originalAsyncOpenOrders;
        }
    });

    it("should skip direct account portfolio and order init calls when MD_ONLY is enabled", async () => {
        const accountSummary = AccountSummary.Instance as any;
        const portfolios = Portfolios.Instance as any;
        const orders = Orders.Instance as any;

        const originalAccountIb = accountSummary.ib;
        const originalPortfolioIb = portfolios.ib;
        const originalOrdersIb = orders.ib;
        const originalSyncPortfolios = portfolios.syncPortfolios;
        const originalSyncOpenOrders = orders.syncOpenOrders;

        const calls = {
            syncPortfolios: 0,
            syncOpenOrders: 0,
        };

        process.env.MD_ONLY = "true";
        accountSummary.ib = null;
        portfolios.ib = null;
        orders.ib = null;
        portfolios.syncPortfolios = () => {
            calls.syncPortfolios += 1;
        };
        orders.syncOpenOrders = () => {
            calls.syncOpenOrders += 1;
        };

        try {
            accountSummary.init();
            portfolios.init();
            await orders.init();

            expect(accountSummary.ib).to.equal(null);
            expect(portfolios.ib).to.equal(null);
            expect(orders.ib).to.equal(null);
            expect(calls).to.deep.equal({
                syncPortfolios: 0,
                syncOpenOrders: 0,
            });
        } finally {
            accountSummary.ib = originalAccountIb;
            portfolios.ib = originalPortfolioIb;
            orders.ib = originalOrdersIb;
            portfolios.syncPortfolios = originalSyncPortfolios;
            orders.syncOpenOrders = originalSyncOpenOrders;
        }
    });
});

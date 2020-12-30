import ibkr, {Contract, EventName, Order} from '@stoqey/ib';
import isEmpty from 'lodash/isEmpty';
import {IBKRAccountSummary} from '../account/account-summary.interfaces';
import AccountSummary from '../account/AccountSummary';
import IBKRConnection from '../connection/IBKRConnection';
import {IBKREVENTS, IbkrEvents} from '../events';
import {publishDataToTopic} from '../events/IbkrEvents.publisher';
import {log, verbose} from '../log';
import {OrderState} from '../orders';
import {PortFolioUpdate} from './portfolios.interfaces';

const appEvents = IbkrEvents.Instance;

/**
 * Log portfolio to console
 * @param @interface PortFolioUpdate
 */
const logPortfolio = ({marketPrice, averageCost, position, symbol, conId}: PortFolioUpdate) => {
    const contractIdWithSymbol = `${symbol} ${conId}`;
    if (Math.round(marketPrice) > Math.round(averageCost)) {
        // We are in profit
        verbose(
            `logPortfolio:profit shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice} `,
            contractIdWithSymbol
        );
    } else {
        // We are in loss
        log(
            `logPortfolio:LOSS shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice}`,
            contractIdWithSymbol
        );
    }
};

export class Portfolios {
    ib: ibkr;

    accountSummary: IBKRAccountSummary;

    private static _instance: Portfolios;

    currentPortfolios: PortFolioUpdate[] = [];
    portfoliosSnapshot: PortFolioUpdate[] = [];

    public static get Instance(): Portfolios {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    public init = async (): Promise<void> => {
        const self = this;
        this.ib = IBKRConnection.Instance.getIBKR();
        const accountId = AccountSummary.Instance.AccountId;

        const ib = this.ib;

        ib.on(
            EventName.updatePortfolio,
            (
                contract,
                position,
                marketPrice,
                marketValue,
                averageCost,
                unrealizedPNL,
                realizedPNL,
                accountName
            ) => {
                const thisPortfolio = {
                    ...contract,
                    position,
                    marketPrice,
                    marketValue,
                    averageCost,
                    unrealizedPNL,
                    realizedPNL,
                    accountName,
                };
                // FIXME: remove `as any` ASAP
                logPortfolio(thisPortfolio as any);
                self.getPortfolios(); // refresh portfolios
            }
        );

        ib.on(EventName.openOrder, function (
            _orderId: number,
            contract: Contract,
            order: Order,
            orderState: OrderState
        ) {
            if (orderState.status === 'Filled') {
                // check if portfolio exit, if not add it
                const existingPortfolio = self.currentPortfolios.find(
                    (porto) => porto.symbol === contract.symbol
                );

                if (isEmpty(existingPortfolio)) {
                    // Add to currentPortfolios
                    // FIXME: remove `as any` ASAP
                    self.currentPortfolios.push(contract as any);
                } else {
                    self.currentPortfolios = self.currentPortfolios.filter(
                        (porto) => porto.symbol !== contract.symbol
                    );
                }

                log(
                    `Portfolio > openOrder FILLED`,
                    ` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`
                );
                verbose(
                    `Portfolio > ALL PORTFOLIOS`,
                    ` -> ${JSON.stringify(self.currentPortfolios.map((por) => por.symbol))}`
                );
                // refresh the portfolios
                self.getPortfolios();
            }
        });

        log('AccountID', accountId);

        ib.reqAccountUpdates(true, accountId);
    };

    /**
     * getPortfolios
     */
    public getPortfolios = async (): Promise<PortFolioUpdate[]> => {
        const self = this;
        const ib = self.ib;

        return new Promise((resolve) => {
            let done = false;
            const portfolios: {[x: string]: PortFolioUpdate} = {};

            const handlePosition = (
                aaccount: string,
                contract: Contract,
                position: number,
                averageCost: number
            ) => {
                const thisPortfolio = {...contract, position, averageCost};

                let symbol = contract && contract.symbol;

                // If forex use localSymbol
                // if option use `symbol date` e.g 'AAPL  200918C00123750'
                if (['CASH', 'OPT'].includes(contract.secType)) {
                    symbol = contract && contract.localSymbol;
                }

                // Position has to be greater than 0
                if (position === 0) {
                    return;
                }

                thisPortfolio.symbol = symbol; // override symbol name

                // FIXME: need to coorindate Contract types with @stoqey/ib (in ib, some of the fields need to be non-optional)
                portfolios[symbol] = thisPortfolio as any;
            };

            const handlePositionEnd = (portfoliosData: PortFolioUpdate[]) => {
                if (!done) {
                    done = true;
                    appEvents.off('position', handlePosition);

                    verbose(
                        'getPortfolios positionEnd',
                        `********************** =`,
                        portfoliosData && portfoliosData.length
                    );

                    self.currentPortfolios = portfoliosData;
                    publishDataToTopic({
                        topic: IBKREVENTS.PORTFOLIOS,
                        data: portfoliosData,
                    });
                    resolve(portfoliosData);
                }
            };

            const positionEnd = () => {
                if (done) {
                    return;
                }

                const portfoliosData = Object.keys(portfolios).map(
                    (portfolioKey) => portfolios[portfolioKey]
                );
                handlePositionEnd(portfoliosData);
                ib.off('positionEnd', positionEnd);
            };

            ib.on(EventName.positionEnd, positionEnd);

            ib.on(EventName.position, handlePosition);

            ib.reqPositions();
        });
    };
}

export default Portfolios;

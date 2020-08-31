import ibkr from '@stoqey/ib';
import isEmpty from 'lodash/isEmpty';
import AccountSummary from '../account/AccountSummary';
import {IBKREVENTS, IbkrEvents} from '../events';
import {publishDataToTopic} from '../events/IbkrEvents.publisher';
import IBKRConnection from '../connection/IBKRConnection';
import {PortFolioUpdate} from './portfolios.interfaces';
import {IBKRAccountSummary} from '../account/account-summary.interfaces';
import {ORDER, OrderState} from '../orders';
import {log, verbose} from '../log';
import {ContractObject} from '../contracts';

const appEvents = IbkrEvents.Instance;

/**
 * Log portfolio to console
 * @param @interface PortFolioUpdate
 */
const logPortfolio = ({marketPrice, averageCost, position, symbol, conId}: PortFolioUpdate) => {
    const contractIdWithSymbol = `${symbol} ${conId}`;
    if (Math.round(marketPrice) > Math.round(averageCost)) {
        // We are in profit
        log(
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
            'updatePortfolio',
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
                logPortfolio(thisPortfolio);
                self.getPortfolios(); // refresh portfolios
            }
        );

        ib.on('openOrder', function (
            orderId,
            contract: ContractObject,
            order: ORDER,
            orderState: OrderState
        ) {
            if (orderState.status === 'Filled') {
                // check if portfolio exit, if not add it
                const existingPortfolio = self.currentPortfolios.find(
                    (porto) => porto.symbol === contract.symbol
                );

                if (isEmpty(existingPortfolio)) {
                    // Add to currentPortfolios
                    self.currentPortfolios.push({
                        ...contract,
                    });
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

            const handlePosition = (account, contract: ContractObject, position, averageCost) => {
                const thisPortfolio = {...contract, position, averageCost};

                let symbol = contract && contract.symbol;

                // If forex use localSymbol
                if (contract.secType === 'CASH') {
                    symbol = contract && contract.localSymbol;
                }

                // Position has to be greater than 0
                if (position === 0) {
                    return;
                }

                thisPortfolio.symbol = symbol; // override symbol name

                if (portfolios[symbol]) {
                    if (Array.isArray(portfolios[symbol])) {
                        portfolios[symbol] = [...portfolios[symbol], thisPortfolio];
                    } else {
                        portfolios[symbol] = [portfolios[symbol], thisPortfolio];
                    }

                } else {
                    portfolios[symbol] = thisPortfolio;
                }
            };

            const handlePositionEnd = (portfoliosData: PortFolioUpdate[]) => {
                if (!done) {
                    done = true;
                    appEvents.off('position', handlePosition);

                    self.currentPortfolios = portfoliosData;
                    publishDataToTopic({
                        topic: IBKREVENTS.PORTFOLIOS,
                        data: portfoliosData,
                    });
                    resolve(portfoliosData);
                }
            };

            ib.once('positionEnd', () => {
                const portfoliosData = Object.keys(portfolios).map(
                    (portfolioKey) => portfolios[portfolioKey]
                );
                log('getPortfolios positionEnd', `********************** =`);
                log(
                    'getPortfolios positionEnd',
                    `********************** ${
                        portfoliosData && portfoliosData.length
                    } symbols=${portfoliosData.map((u) => u.localSymbol)}`
                );
                handlePositionEnd(portfoliosData);
            });

            ib.on('position', handlePosition);

            ib.reqPositions();
        });
    };
}

export default Portfolios;

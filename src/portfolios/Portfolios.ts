import _ from 'lodash';
import AccountSummary from '../account/AccountSummary';
import { IBKREVENTS, IbkrEvents } from '../events';
import { publishDataToTopic } from '../events/IbkrEvents.publisher';
import IBKRConnection from '../connection/IBKRConnection';
import { PortFolioUpdate } from './portfolios.interfaces';
import isEmpty from 'lodash/isEmpty';
import { IBKRAccountSummary } from '../account/account-summary.interfaces';
import { ORDER, OrderState } from '../orders';
import { log, verbose } from '../log';
import { ContractObject } from '../contracts';

const appEvents = IbkrEvents.Instance;


/**
 * Log portfolio to console
 * @param @interface PortFolioUpdate
 */
const logPortfolio = ({ marketPrice, averageCost, position, symbol, conId }: PortFolioUpdate) => {

    const contractIdWithSymbol = `${symbol} ${conId}`
    if (Math.round(marketPrice) > Math.round(averageCost)) {
        // We are in profit
        log(`logPortfolio:profit shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice} `, contractIdWithSymbol);
    }
    else {
        // We are in loss
        log(`logPortfolio:LOSS shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice}`, contractIdWithSymbol)
    }
}


export class Portfolios {

    ib: any;

    accountSummary: IBKRAccountSummary;

    private static _instance: Portfolios;

    currentPortfolios: PortFolioUpdate[] = [];
    portfoliosSnapshot: PortFolioUpdate[] = [];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() { }

    public init = async () => {

        const self = this;

        this.ib = IBKRConnection.Instance.getIBKR();
        this.accountSummary = await AccountSummary.Instance.getAccountSummary();

        const ib = this.ib;

        ib.on('accountDownloadEnd', () => {
            const { currentPortfolios, portfoliosSnapshot } = self;
            log('accountDownloadEnd', `********************** Portfolios ${currentPortfolios.length}`);

            if (currentPortfolios !== portfoliosSnapshot) {
                // update snapshot
                self.portfoliosSnapshot = currentPortfolios;
            }

            // Emit empty portfolio/*  */
            publishDataToTopic({
                topic: IBKREVENTS.PORTFOLIOS,
                data: currentPortfolios
            });

        })

        ib.on('updatePortfolio', (contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName) => {
            const thisPortfolio = { ...contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName };

            // Position has to be greater than 0
            if (position === 0) {
                return log(`updatePortfolio: positions are empty = ${contract && contract.symbol}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice} `);
            }

            logPortfolio(thisPortfolio);

            // Check if portfolio exists in currentPortfolios
            const isPortFolioAlreadyExist = self.currentPortfolios.find(portfo => { portfo.symbol === thisPortfolio.symbol });

            if (!isPortFolioAlreadyExist) {
                //positions changed
                self.currentPortfolios.push(thisPortfolio);
                self.currentPortfolios = _.uniqBy(self.currentPortfolios, "symbol");
            }
        });

        ib.on('openOrder', function (orderId, contract: ContractObject, order: ORDER, orderState: OrderState) {
            if (orderState.status === "Filled") {
                // check if portfolio exit, if not add it
                const existingPortfolio = self.currentPortfolios.find(porto => porto.symbol === contract.symbol);

                if (isEmpty(existingPortfolio)) {
                    // Add to currentPortfolios
                    self.currentPortfolios.push({
                        ...contract,
                    });
                }
                else {
                    self.currentPortfolios = self.currentPortfolios.filter(porto => porto.symbol !== contract.symbol)
                }

                log(`Portfolio > openOrder FILLED`, ` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`);
                verbose(`Portfolio > ALL PORTFOLIOS`, ` -> ${JSON.stringify(self.currentPortfolios.map(por => por.symbol))}`);
                // refresh the portfolios
                self.reqAccountUpdates();
            }
        });


        this.reqAccountUpdates();
    }

    /**
     * reqAccountUpdates
     */
    public reqAccountUpdates = () => {
        let that = this;
        setImmediate(() => {
            that.ib.reqAccountUpdates(true, that.accountSummary.AccountId);
        })
    }

    /**
     * getPortfolios
     */
    public getPortfolios = async (): Promise<PortFolioUpdate[]> => {
        const { currentPortfolios, reqAccountUpdates } = this;
        let done = false;
        return new Promise((resolve, reject) => {

            // listen for portfolios
            const handlePortfolios = (accountSummaryData) => {
                if (!done) {
                    done = true;
                    appEvents.off(IBKREVENTS.PORTFOLIOS, handlePortfolios);
                    resolve(accountSummaryData || currentPortfolios);
                }
            }

            if (!isEmpty(currentPortfolios)) {
                return resolve(currentPortfolios);
            }

            appEvents.on(IBKREVENTS.PORTFOLIOS, handlePortfolios);

            reqAccountUpdates();
        })

    }


}




export default Portfolios;
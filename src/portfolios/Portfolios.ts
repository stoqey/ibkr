import _ from 'lodash';
import chalk from 'chalk';
import AccountSummary from '../account/AccountSummary';
import { APPEVENTS, AppEvents } from '../events';
import { publishDataToTopic } from '../events/AppEvents.publisher';
import IBKRConnection from '../connection/IBKRConnection';
import { PortFolioUpdate } from './portfolios.interfaces';
import isEmpty from 'lodash/isEmpty';
import { IBKRAccountSummary } from '../account/account-summary.interfaces';

const appEvents = AppEvents.Instance;


/**
 * Log portfolio to console
 * @param @interface PortFolioUpdate
 */
const logPortfolio = ({ marketPrice, averageCost, position, contract }: PortFolioUpdate) => {
    const symbol = contract && contract.symbol;
    const contractIdWithSymbol = `${symbol} ${contract.conId}`
    if (Math.round(marketPrice) > Math.round(averageCost)) {
        // We are in profit
        console.log(chalk.green(`DATA:STREAM shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice} `, chalk.black(contractIdWithSymbol)))
    }
    else {
        // We are in loss
        console.log(chalk.red(`DATA:STREAM shares = ${position}, costPerShare -> ${averageCost} marketPrice -> ${marketPrice}`, chalk.black(contractIdWithSymbol)))
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
            console.log(chalk.blue('END:PROMISE accountDownloadEnd'))
            console.log(chalk.blueBright(`********************************************************** Portfolio changed emitting to listeners ${currentPortfolios.length}`))

            if (currentPortfolios !== portfoliosSnapshot) {
                // update snapshot
                self.portfoliosSnapshot = currentPortfolios;
            }

            // Emit empty portfolio/*  */
            publishDataToTopic({
                topic: APPEVENTS.PORTFOLIOS,
                data: {
                    portfolios: currentPortfolios
                }
            });

        })

        ib.on('updatePortfolio', (contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName) => {
            const thisPortfolio = { contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName };


            logPortfolio(thisPortfolio);

            // Send Portfolios
            publishDataToTopic({
                topic: APPEVENTS.PORTFOLIOS,
                data: {
                    portfolios: [thisPortfolio]
                }
            });

            // Check if portfolio exists in currentPortfolios
            const isPortFolioAlreadyExist = this.currentPortfolios.find(portfo => { portfo.contract.symbol === thisPortfolio.contract.symbol });

            // Position has to be greater than 0
            if (!isPortFolioAlreadyExist && position > 0) {
                //postions changed
                this.currentPortfolios.push(thisPortfolio);
                this.currentPortfolios = _.uniqBy(this.currentPortfolios, "contract.symbol");
            }
        });

        this.reqAccountUpdates();
    }

    /**
     * reqAccountUpdates
     */
    public reqAccountUpdates = () => {
        this.ib.reqAccountUpdates(true, this.accountSummary.AccountId);
    }

    /**
     * getPortfolios
     */
    public getPortfolios(): Promise<PortFolioUpdate[]> {
        const { currentPortfolios, reqAccountUpdates } = this;
        return new Promise((resolve, reject) => {

            if (!isEmpty(currentPortfolios)) {
                return resolve(currentPortfolios);
            }



            // listen for account summary
            const handleAccountSummary = (accountSummaryData) => {
                appEvents.off(APPEVENTS.PORTFOLIOS, handleAccountSummary);
                resolve(accountSummaryData);
            }
            appEvents.on(APPEVENTS.PORTFOLIOS, handleAccountSummary);

            reqAccountUpdates();
        })

    }

    // getPortfolios(): PortFolioUpdate[] {
    //     return this.currentPortfolios;
    // }


}




export default Portfolios;
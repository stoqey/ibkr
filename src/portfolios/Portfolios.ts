import _ from 'lodash';
import chalk from 'chalk';
import AccountSummary from '../account/AccountSummary';
import { APPEVENTS } from '../events';
import { publishDataToTopic } from '../events/AppEvents.publisher';
import IBKRConnection from '../connection/IBKRConnection';
import { PortFolioUpdate } from './portfolios.interfaces';

const accountSummary = AccountSummary.Instance;

const ib = IBKRConnection.Instance.getIBKR();

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

    private static _instance: Portfolios;

    currentPortfolios: PortFolioUpdate[] = [];
    portfoliosSnapshot: PortFolioUpdate[] = [];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

        ib.on('accountDownloadEnd', () => {
            console.log(chalk.blue('END:PROMISE accountDownloadEnd'))
            console.log(chalk.blueBright(`********************************************************** Portfolio changed emitting to listeners ${this.currentPortfolios.length}`))

            if (this.currentPortfolios !== this.portfoliosSnapshot) {
                // update snapshot
                this.portfoliosSnapshot = this.currentPortfolios;
            }

        })

        ib.on('updatePortfolio', (contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName) => {
            const thisPortfolio = { contract, position, marketPrice, marketValue, averageCost, unrealizedPNL, realizedPNL, accountName };
            

            if (position > 0) {
                
                logPortfolio(thisPortfolio);

                // Send Portfolios
                publishDataToTopic({
                    topic: APPEVENTS.PORTFOLIOS,
                    data: {
                        portfolios: [thisPortfolio]
                    }
                });
            }



            // Check if portfolio exists in currentPortfolios
            const isPortFolioAlreadyExist = this.currentPortfolios.find(portfo => { portfo.contract.symbol === thisPortfolio.contract.symbol });

            // Position has to be greater than 0
            if (!isPortFolioAlreadyExist && position > 0) {
                //postions changed
                this.currentPortfolios.push(thisPortfolio);
                this.currentPortfolios = _.uniqBy(this.currentPortfolios, "contract.symbol");
            }
        });

        ib.reqAccountUpdates(true, accountSummary.AccountId);
    }

    getPortfolios(): PortFolioUpdate[] {
        return this.currentPortfolios;
    }


}


export default Portfolios;
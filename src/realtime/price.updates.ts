import isEmpty from 'lodash/isEmpty';
import {TickPrice} from './price.interfaces';
import {IBKRConnection} from '../connection';
import {publishDataToTopic, IbkrEvents, IBKREVENTS} from '../events';
import {getRadomReqId} from '../_utils/text.utils';
import {log, verbose} from '../log';
import {getContractDetails} from '../contracts';
import {isArray} from 'lodash';

const ibEvents = IbkrEvents.Instance;

interface SymbolSubscribers {
    [x: string]: number;
}

interface SymbolWithTicker {
    tickerId: number;
    symbol: string;
    tickType?: TickPrice;
}

interface ReqPriceUpdates {
    tickType?: TickPrice;
}

type ISubScribe = Record<any, any> & {
    contract: any;
    opt: ReqPriceUpdates;
};

export class PriceUpdates {
    ib: any;
    subscribers: SymbolSubscribers = {};

    subscribersWithTicker: SymbolWithTicker[] = [];

    private static _instance: PriceUpdates;

    public static get Instance(): PriceUpdates {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const that = this;
        /**
         * When request to subscribe to market data
         * IBKREVENTS.SUBSCRIBE_PRICE_UPDATES
         */
        ibEvents.on(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, (data: any) => {
            that.subscribe(data);
        });
    }

    /**
     * init
     */
    public init(): void {
        const ib = IBKRConnection.Instance.getIBKR();

        this.ib = ib;
        const that = this;

        ib.on(
            'tickPrice',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (tickerId: number, tickType: TickPrice, price: number, _canAutoExecute: boolean) => {
                const thisSymbol = that.subscribersWithTicker.find(
                    (symbol) => symbol.tickerId === tickerId
                );

                const currentTickerType = thisSymbol.tickType;

                const currentSymbol = thisSymbol && thisSymbol.symbol;

                const tickTypeWords = ib.util.tickTypeToString(tickType);

                if (isEmpty(currentSymbol)) {
                    log('PriceUpdates.tickPrice', `Symbol not found ${JSON.stringify(thisSymbol)}`);
                    return;
                }

                // https://www.investopedia.com/terms/b/bid-and-ask.asp

                // Matches as requested
                if (currentTickerType === tickTypeWords) {
                    log(
                        'PriceUpdates.tickPrice',
                        `${tickTypeWords}:PRICE ${currentSymbol} => $${price} tickerId = ${tickerId}`
                    );

                    if (price === -1) {
                        return log(
                            'PriceUpdates.tickPrice',
                            `${tickTypeWords}:PRICE NULL ${currentSymbol} $${price}`
                        );
                    }

                    const dataToPublish: {
                        symbol: string;
                        price: number;
                        date: Date;
                    } = {
                        symbol: currentSymbol,
                        price,
                        date: new Date(),
                    };

                    // send to symbolData topic
                    publishDataToTopic({
                        topic: IBKREVENTS.ON_PRICE_UPDATES,
                        data: dataToPublish,
                    });
                }
            }
        );
    }

    private async subscribe(args: ISubScribe) {
        const opt = args && args.opt;
        const contractArg = args && args.contract;

        const tickType = (args && args.tickType) || (opt && opt.tickType) || 'ASK';
        const that = this;

        let symbol = (contractArg && contractArg.symbol) || contractArg;

        console.log('contract before getting Detaiuls', contractArg);
        const contractObj: any = await getContractDetails(contractArg);

        let contract: any = contractObj;

        if (!isArray(contractObj)) {
            contract = contractObj?.summary || contractArg;
        } else {
            contract = contractObj[0]?.summary || contractArg;
        }

        const includesForexOrOpt = ['CASH', 'OPT'].includes(contract?.secType || '');
        if (includesForexOrOpt) {
            symbol = contract && contract.localSymbol;
        }

        if (!that.ib) {
            that.init();
        }

        // Check if symbol exist
        if (isEmpty(symbol)) {
            return log('PriceUpdates.subscribe', `Symbol cannot be null`);
        }

        // Check if we already have the symbol
        if (this.subscribers[symbol]) {
            //  symbol is already subscribed
            return verbose(
                'PriceUpdates.subscribe',
                `${symbol.toLocaleUpperCase()} is already subscribed`
            );
        }

        // Assign random number for symbol
        this.subscribers[symbol] = getRadomReqId();

        // Add this symbol to subscribersTicker
        this.subscribersWithTicker.push({
            symbol,
            tickerId: that.subscribers[symbol],
            tickType,
            ...contract,
        });

        setImmediate(() => {
            that.ib.reqMktData(that.subscribers[symbol], contract, '', false, false);
            return log(
                'PriceUpdates.subscribe',
                `${symbol.toLocaleUpperCase()} is successfully subscribed`
            );
        });
    }

    public unsubscribeAllSymbols(): void {
        const that = this;

        setTimeout(() => {
            if (!isEmpty(that.subscribersWithTicker)) {
                that.subscribersWithTicker.forEach((symbolTicker) => {
                    log(`cancelMktData ${symbolTicker.symbol} tickerId=${symbolTicker.tickerId}`);
                    that.ib.cancelMktData(symbolTicker.tickerId);
                });
            }
            return;
        }, 1000);
    }
}

export default PriceUpdates;

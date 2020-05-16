
import chalk from 'chalk';
import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import { SymbolWithData, TickSize, TickPrice } from './price.interfaces';
import { IBKRConnection } from '../connection';
import { publishDataToTopic, IbkrEvents, IBKREVENTS } from '../events';
import { getRadomReqId } from '../_utils/text.utils';

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
    symbol: string;
    tickType?: TickPrice;
}

export class PriceUpdates {

    ib: any;
    subscribers: SymbolSubscribers = {};

    subscribersWithTicker: SymbolWithTicker[] = [];

    private static _instance: PriceUpdates;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        let that = this;
        /**
         * When request to subscribe to market data
         * IBKREVENTS.SUBSCRIBE_PRICE_UPDATES
         */
        ibEvents.on(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, (data: ReqPriceUpdates) => {
            that.subscribe(data);
        });

    }

    /**
     * init
     */
    public init() {
        const ib = IBKRConnection.Instance.getIBKR();

        this.ib = ib;
        let that = this;

        ib.on('tickPrice', (tickerId: number, tickType: TickPrice, price: number, canAutoExecute: boolean) => {


            const thisSymbol = that.subscribersWithTicker.find(symbol => symbol.tickerId === tickerId);

            const currentTickerType = thisSymbol.tickType;

            const currentSymbol = thisSymbol && thisSymbol.symbol;

            const tickTypeWords = ib.util.tickTypeToString(tickType);

            if (isEmpty(currentSymbol)) {
                console.log('PriceUpdates.tickPrice', chalk.red(`Symbol not found ${JSON.stringify(thisSymbol)}`))
                return;
            }

            // https://www.investopedia.com/terms/b/bid-and-ask.asp

            // Matches as requested
            if (currentTickerType === tickTypeWords) {
                console.log('PriceUpdates.tickPrice', chalk.dim(`${tickTypeWords}:PRICE ${chalk.bold(currentSymbol)} => $${price} tickerId = ${tickerId}`))

                if (price === -1) {
                    return console.log('PriceUpdates.tickPrice', chalk.red(`${tickTypeWords}:PRICE NULL ${chalk.bold(currentSymbol)} $${price}`))
                }

                const dataToPublish: {
                    symbol: string;
                    price: number;
                    date: Date;

                } = {
                    symbol: currentSymbol,
                    price,
                    date: new Date()
                }

                // send to symbolData topic
                publishDataToTopic({
                    topic: IBKREVENTS.ON_PRICE_UPDATES,
                    data: dataToPublish
                });

            }

        })


    }

    private subscribe({ symbol, tickType = 'ASK' }: ReqPriceUpdates) {

        let that = this;

        if (!that.ib) {
            that.init()
        }

        // Check if symbol exist
        if (isEmpty(symbol)) {
            return console.log('PriceUpdates.subscribe', chalk.dim(`Symbol cannot be null`));
        }

        // Check if we already have the symbol
        if (this.subscribers[symbol]) {
            //  symbol is already subscribed
            return console.log('PriceUpdates.subscribe', chalk.dim(`${symbol.toLocaleUpperCase()} is already subscribed`))
        }

        // Assign random numbe for symbol
        this.subscribers[symbol] = getRadomReqId();

        // Add this symbol to subscribersTicker
        this.subscribersWithTicker.push({
            symbol,
            tickerId: that.subscribers[symbol],
            tickType
        });

        setImmediate(() => {
            that.ib.reqMktData(that.subscribers[symbol], that.ib.contract.stock(symbol), '', false, false);
            console.log('PriceUpdates.subscribe', chalk.greenBright(`${symbol.toLocaleUpperCase()} is successfully subscribed`))
        })

    }

    public unsubscribeAllSymbols() {
        let that = this;

        setTimeout(() => {
            if (!isEmpty(that.subscribersWithTicker)) {
                that.subscribersWithTicker.forEach((symbolTicker) => {
                    console.log(chalk.dim(`cancelMktData ${symbolTicker.symbol} tickerId=${symbolTicker.tickerId}`))
                    that.ib.cancelMktData(symbolTicker.tickerId);
                });
            }
            return;
        }, 1000);
    }
}

export default PriceUpdates;
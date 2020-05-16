
import _ from 'lodash';
import isEmpty from 'lodash/isEmpty';
import { SymbolWithData, TickSize, TickPrice } from './price.interfaces';
import { IBKRConnection } from '../connection';
import { publishDataToTopic, IbkrEvents, IBKREVENTS } from '../events';
import { getRadomReqId } from '../_utils/text.utils';
import { log } from '../log';

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
                log('PriceUpdates.tickPrice', `Symbol not found ${JSON.stringify(thisSymbol)}`);
                return;
            }

            // https://www.investopedia.com/terms/b/bid-and-ask.asp

            // Matches as requested
            if (currentTickerType === tickTypeWords) {
                log('PriceUpdates.tickPrice', `${tickTypeWords}:PRICE ${currentSymbol} => $${price} tickerId = ${tickerId}`);

                if (price === -1) {
                    return log('PriceUpdates.tickPrice', `${tickTypeWords}:PRICE NULL ${currentSymbol} $${price}`);
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
            return log('PriceUpdates.subscribe', `Symbol cannot be null`);
        }

        // Check if we already have the symbol
        if (this.subscribers[symbol]) {
            //  symbol is already subscribed
            return log('PriceUpdates.subscribe', `${symbol.toLocaleUpperCase()} is already subscribed`);
        }

        // Assign random number for symbol
        this.subscribers[symbol] = getRadomReqId();

        // Add this symbol to subscribersTicker
        this.subscribersWithTicker.push({
            symbol,
            tickerId: that.subscribers[symbol],
            tickType
        });

        setTimeout(() => {
            that.ib.reqMktData(that.subscribers[symbol], that.ib.contract.stock(symbol), '', false, false);
            return log('PriceUpdates.subscribe', `${symbol.toLocaleUpperCase()} is successfully subscribed`);
        }, 900)

    }

    public unsubscribeAllSymbols() {
        let that = this;

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
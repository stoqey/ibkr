import {isArray} from 'lodash';
import isEmpty from 'lodash/isEmpty';
import {IBKRConnection} from '../connection';
import {ContractSummary, getContractDetails} from '../contracts';
import {IbkrEvents, IBKREVENTS, publishDataToTopic} from '../events';
import {log, verbose} from '../log';
import {getRadomReqId} from '../_utils/text.utils';
import {PriceUpdatesEvent, TickPrice} from './price.interfaces';

const ibEvents = IbkrEvents.Instance;

interface SymbolWithTicker {
    readonly tickerId: number;
    readonly conId: number | undefined;
    readonly symbol: string;
    readonly tickType?: TickPrice | TickPrice[];
}

interface ReqPriceUpdates {
    tickType?: TickPrice | TickPrice[];
}

type ISubscribe = Record<any, any> & {
    contract: any;
    opt: ReqPriceUpdates;
};

export class PriceUpdates {
    ib: any;
    // subscribers: SymbolSubscribers = {};

    // subscribersWithTicker: SymbolWithTicker[] = [];
    keyToTickerId: {[key: string]: number} = {};
    tickerIdToData: {[tickerId: string]: SymbolWithTicker} = {};

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
        ibEvents.on(IBKREVENTS.SUBSCRIBE_PRICE_UPDATES, async (data: any) => {
            return that.subscribe(data);
        });

        /**
         * When request to unsubscribe to market data
         * IBKREVENTS.UNSUBSCRIBE_PRICE_UPDATES
         */
        ibEvents.on(IBKREVENTS.UNSUBSCRIBE_PRICE_UPDATES, async (data: any) => {
            return that.unsubscribe(data);
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
                const thisSymbol = that.tickerIdToData[tickerId];
                const tickTypeWords = ib.util.tickTypeToString(tickType);

                log(
                    'PriceUpdates.tickPrice',
                    `tickerId=${tickerId}, tickType=${tickType}/${tickTypeWords}, price=${price} ${JSON.stringify(
                        {
                            s: thisSymbol.symbol,
                            ticker: thisSymbol.tickerId,
                        }
                    )}`
                );

                const currentTickerType = thisSymbol.tickType;

                const currentSymbol = thisSymbol && thisSymbol.symbol;

                if (isEmpty(currentSymbol)) {
                    log('PriceUpdates.tickPrice', `Symbol not found ${JSON.stringify(thisSymbol)}`);
                    return;
                }

                // https://www.investopedia.com/terms/b/bid-and-ask.asp

                // Matches as requested
                if (
                    currentTickerType === undefined ||
                    (typeof currentTickerType === 'string' &&
                        currentTickerType === tickTypeWords) ||
                    (isArray(currentTickerType) && currentTickerType.includes(tickTypeWords as any))
                ) {
                    log(
                        'PriceUpdates.tickPrice',
                        `${tickTypeWords}:PRICE ${currentSymbol} => $${price} tickerId = ${tickerId}`
                    );

                    const dataToPublish: PriceUpdatesEvent = {
                        tickType: tickTypeWords as any,
                        symbol: currentSymbol,
                        price: price === -1 ? null : price,
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

    private async subscribe(args: ISubscribe) {
        const that = this;
        const ib = IBKRConnection.Instance.getIBKR();
        const opt = args && args.opt;
        let contractArg = args && args.contract;

        if (isEmpty(contractArg)) {
            return; // verbose('contract is not defined', contractArg);
        }

        // If string, create stock contract as default
        if (typeof contractArg === 'string') {
            contractArg = ib.contract.stock(contractArg);
        }

        const tickType = (args && args.tickType) || (opt && opt.tickType);

        let symbol = (contractArg && contractArg.symbol) || contractArg;

        log('contract before getting details', symbol);

        const contractDetailsResult = await getContractDetails(contractArg);

        const contract: Partial<ContractSummary> = !isArray(contractDetailsResult)
            ? contractDetailsResult?.summary ?? contractArg
            : contractDetailsResult[0]?.summary ?? contractArg;

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

        const key = contract?.conId ?? symbol;

        // Check if we already have the symbol
        if (that.keyToTickerId[key]) {
            //  symbol is already subscribed
            return verbose('PriceUpdates.subscribe', `${key}/${symbol} is already subscribed`);
        }

        // Assign random number for symbol
        const tickerIdToUse = getRadomReqId();
        that.keyToTickerId[key] = tickerIdToUse;

        // Add this symbol to subscribersTicker
        that.tickerIdToData[tickerIdToUse] = {
            tickerId: tickerIdToUse,
            conId: contract?.conId,
            symbol,
            tickType,
        };

        setImmediate(() => {
            that.ib.reqMktData(tickerIdToUse, contract, '', false, false);
            return log(
                'PriceUpdates.subscribe',
                `${symbol.toLocaleUpperCase()} is successfully subscribed`
            );
        });
    }

    public unsubscribeAllSymbols(): void {
        const that = this;

        setTimeout(() => {
            for (const symbolTicker of Object.values(this.tickerIdToData)) {
                log(`cancelMktData ${symbolTicker.symbol} tickerId=${symbolTicker.tickerId}`);
                that.ib.cancelMktData(symbolTicker.tickerId);
            }
            this.tickerIdToData = {};
            this.keyToTickerId = {};
        }, 1000);
    }

    /**
     * unsubscribe
     */
    public unsubscribe(contract: {readonly conId?: number; readonly symbol?: string}): void {
        const that = this;

        const {conId, symbol} = contract;
        const key = conId ?? symbol;
        if (!key) {
            return;
        }

        const tickerId = this.keyToTickerId[key];
        if (!tickerId) {
            return;
        }

        setTimeout(() => {
            const symbolTicker = this.tickerIdToData[tickerId];
            if (symbolTicker) {
                log(`cancelMktData ${symbolTicker.symbol} tickerId=${symbolTicker.tickerId}`);
                that.ib.cancelMktData(symbolTicker.tickerId);
            }
            delete this.tickerIdToData[tickerId];
            delete this.keyToTickerId[key];
        }, 1000);
    }
}

export default PriceUpdates;

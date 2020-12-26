import {isArray} from 'lodash';
import isEmpty from 'lodash/isEmpty';
import {IBKRConnection} from '../connection';
import {
    ContractObject,
    ContractSummary,
    convertContractToContractDetailsParams,
    getContractDetails,
} from '../contracts';
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
    contract: string | Partial<ContractObject>;
    opt: ReqPriceUpdates;
};

export class PriceUpdates {
    ib: any;

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

    public async subscribe(args: ISubscribe): Promise<void> {
        const that = this;
        const ib = IBKRConnection.Instance.getIBKR();
        const opt = args && args.opt;

        const contractArg =
            typeof args?.contract === 'string' ? ib.contract.stock(args.contract) : args?.contract;
        if (isEmpty(contractArg)) {
            return; // verbose('contract is not defined', contractArg);
        }
        log('contract before getting details', contractArg);

        const tickType = (args && args.tickType) || (opt && opt.tickType);

        const contractDetailsParams = convertContractToContractDetailsParams(contractArg);
        const contractDetailsList = await getContractDetails(contractDetailsParams);

        if (contractDetailsList.length !== 1) {
            log('contract details are ambiguous, expected exactly one:', contractDetailsList);
        }

        const contract: ContractSummary = contractDetailsList[0].summary;
        log('contract to be queried:', contract);

        const includesForexOrOpt = ['CASH', 'OPT'].includes(contract.secType);
        const symbol = includesForexOrOpt ? contract.localSymbol : contract.symbol;
        // Check if symbol exist
        if (!symbol) {
            return log('PriceUpdates.subscribe', `Symbol cannot be null`);
        }

        if (!that.ib) {
            that.init();
        }

        const conId = contract.conId;
        const key = conId.toString();

        // Check if we already have the symbol
        if (that.keyToTickerId[key]) {
            //  symbol is already subscribed
            return verbose('PriceUpdates.subscribe', `${conId}/${symbol} is already subscribed`);
        }

        // Assign random number for symbol
        const tickerIdToUse = getRadomReqId();
        that.keyToTickerId[key] = tickerIdToUse;

        // Add this symbol to subscribersTicker
        that.tickerIdToData[tickerIdToUse] = {
            tickerId: tickerIdToUse,
            conId,
            symbol,
            tickType,
        };

        setImmediate(() => {
            that.ib.reqMktData(tickerIdToUse, contract, '', false, false);
            return log('PriceUpdates.subscribe', `${conId}/${symbol} is successfully subscribed`);
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

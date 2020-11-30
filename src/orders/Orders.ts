import IB from '@stoqey/ib';
import isEmpty from 'lodash/isEmpty';
import {
    ORDER,
    OrderState,
    CreateSale,
    OrderWithContract,
    OrderStatus,
    OrderStatusType,
    OrderStock,
} from './orders.interfaces';

import {publishDataToTopic, IbkrEvents, IBKREVENTS} from '../events';
import IBKRConnection from '../connection/IBKRConnection';
import {log, verbose} from '../log';
import {createSymbolAndTickerId} from './Orders.util';

const ibkrEvents = IbkrEvents.Instance;

// Place Order + Cancel Order
// Get Filled open orders

interface SymbolTickerOrder {
    id: string;
    tickerId: number;
    orderPermId?: number; // for reference when closing it
    symbol: string;
    stockOrderRequest: OrderStock;
    orderStatus?: OrderStatusType;
}

export class Orders {
    ib: IB = null;

    // StockOrders
    tickerId = 0;
    processing = false;

    /**
     * Orders to be taken from nextValidId
     * These are always deleted after order is submitted to IB
     */
    stockOrders: OrderStock[] = [];

    timeoutRetries: {[x: string]: NodeJS.Timeout[]} = {};

    /**
     * A ledger of orders that are being executed,
     * This is to avoid duplicate orders
     * @unique
     * new order overrides old one
     * only filled, canceled, error orders can be overridden
     */
    tickersAndOrders: SymbolTickerOrder[] = [];

    /**
     * Redundant orderIdNext recorded
     */
    orderIdNext: number = null;

    // OPEN ORDERS
    public openOrders: {[x: string]: OrderWithContract} = {};
    public receivedOrders = false; // stopper

    private static _instance: Orders;

    public static get Instance(): Orders {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const self = this;

        // only when connected createSale
        ibkrEvents.on(IBKREVENTS.CONNECTED, async () => {
            self.init();
        });

        ibkrEvents.emit(IBKREVENTS.PING); // ping connection
    }

    /**
     * init
     */
    public init = async (): Promise<void> => {
        const self = this;

        if (!self.ib) {
            const ib = IBKRConnection.Instance.getIBKR();
            self.ib = ib;

            ib.on('openOrderEnd', () => {
                // Initialise OrderTrader
                // OrderTrade.Instance.init();

                const openOrders = Object.keys(self.openOrders).map((key) => self.openOrders[key]);

                publishDataToTopic({
                    topic: IBKREVENTS.OPEN_ORDERS,
                    data: openOrders,
                });
            });

            ib.on(
                'orderStatus',
                (
                    id,
                    status,
                    filled,
                    remaining,
                    avgFillPrice,
                    permId,
                    parentId,
                    lastFillPrice,
                    clientId,
                    whyHeld
                ) => {
                    const currentOrder = self.openOrders[id];

                    const orderStatus: OrderStatus = {
                        status,
                        filled,
                        remaining,
                        avgFillPrice,
                        permId,
                        parentId,
                        lastFillPrice,
                        clientId,
                        whyHeld,
                    };

                    publishDataToTopic({
                        topic: IBKREVENTS.ORDER_STATUS, //push to topic below,
                        data: {
                            order: currentOrder,
                            orderStatus,
                        },
                    });

                    verbose(
                        `Orders > orderStatus ${currentOrder && currentOrder.symbol}`,
                        JSON.stringify({
                            id,
                            status,
                            filled,
                            remaining,
                            symbol: currentOrder && currentOrder.symbol,
                        })
                    );
                }
            );

            ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
                // 1. Update OpenOrders
                // Orders that need to be filled
                // -----------------------------------------------------------------------------------
                self.receivedOrders = true;

                const openOrders = self.openOrders;

                self.openOrders = {
                    ...openOrders,
                    [orderId]: {
                        ...((openOrders && openOrders[orderId]) || null),

                        // OrderId + orderState
                        orderId,
                        orderState,

                        // Add order
                        ...order,
                        // Add contract
                        ...contract,
                    },
                };
                //  Delete order from openOrders list
                if (orderState.status === 'Filled') {
                    log(
                        `Filled -----> DELETE FROM OPEN ORDERS -------> symbol=${
                            contract && contract.symbol
                        }`
                    );
                    delete self.openOrders[orderId];
                }

                //  Delete order from openOrders list
                if (['PendingCancel', 'Cancelled', 'ApiCancelled'].includes(orderState.status)) {
                    log(
                        `${orderState.status} -----> DELETE FROM OPEN ORDERS -------> ${
                            contract && contract.symbol
                        }`
                    );
                    delete self.openOrders[orderId];
                }

                const openOrdersArr = Object.keys(self.openOrders).map(
                    (key) => self.openOrders[key]
                );
                log(`OPEN ORDERS ${openOrdersArr && openOrdersArr.length}`);
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

                // 2. Update OrderStocks
                // Orders requests to send to transmit
                // Using ticker Ids
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                const allTickerOrder: SymbolTickerOrder[] = self.tickersAndOrders;

                const thisOrderTicker = allTickerOrder.find(
                    (tickerOrder) => tickerOrder.tickerId === orderId
                );

                // Add permId to orderTickObject
                if (!isEmpty(thisOrderTicker)) {
                    let updatedSymbolTicker: SymbolTickerOrder = null;
                    // update this symbolTickerOrder
                    self.tickersAndOrders = self.tickersAndOrders.map((i) => {
                        if (i.tickerId === orderId) {
                            const updatedSymbolTickerX = {
                                ...i,
                                orderPermId: order.permId,
                                symbol: thisOrderTicker.symbol,
                                orderStatus: orderState.status, // update order state
                            };
                            updatedSymbolTicker = updatedSymbolTickerX;
                            return updatedSymbolTickerX;
                        }
                        return i;
                    });

                    // create sale if order is filled
                    if (orderState.status === 'Filled') {
                        // Order is filled we can record it
                        // Check if we can create new trade
                        // on if stockOrderRequest is present
                        // that.symbolsTickerOrder[thisOrderTicker.symbol]
                        if (!isEmpty(updatedSymbolTicker.stockOrderRequest)) {
                            const {stockOrderRequest} = updatedSymbolTicker;
                            const {exitTrade, exitParams, symbol, capital} = stockOrderRequest;

                            const dataSaleSymbolOrder: OrderWithContract = {
                                ...order,
                                ...contract,
                                orderState,
                                orderId,
                            };

                            if (exitTrade) {
                                const {exitPrice, exitTime, entryTime, entryPrice} = exitParams;
                                // If this trade is for exiting then record the sale
                                // create sale now
                                const newSale: CreateSale = {
                                    capital,
                                    exitPrice,
                                    exitTime,
                                    entryTime,
                                    entryPrice,
                                    symbol,
                                    profit: entryPrice - exitPrice,
                                };

                                log(
                                    `AccountOrderStock.openOrder`,
                                    `FILLED, TO CREATE SALE -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`
                                );

                                return publishDataToTopic({
                                    topic: IBKREVENTS.ORDER_FILLED,
                                    data: {sale: newSale, order: dataSaleSymbolOrder},
                                });
                            }

                            log(
                                `AccountOrderStock.openOrder`,
                                `FILLED, but no sale created -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`
                            );

                            publishDataToTopic({
                                topic: IBKREVENTS.ORDER_FILLED,
                                data: {sale: null, order: dataSaleSymbolOrder},
                            });
                        }
                    }
                }
            });

            // placeOrder event
            ibkrEvents.on(
                IBKREVENTS.PLACE_ORDER,
                async ({stockOrder}: {stockOrder: OrderStock}) => {
                    await self.placeOrder(stockOrder);
                }
            );
        }
    };

    public getOpenOrders = async (timeout?: number): Promise<OrderWithContract[]> => {
        const self = this;

        let openedOrders = {};

        return new Promise((resolve) => {
            let done = false;

            // listen for account summary
            const handleOpenOrders = (ordersData) => {
                if (!done) {
                    self.ib.off('openOrder', handleOpenOrders);
                    done = true;
                    resolve(ordersData);
                }
            };

            self.ib.on('openOrderEnd', () => {
                const openOrders = Object.keys(openedOrders).map((key) => openedOrders[key]);
                handleOpenOrders(openOrders);
            });

            self.ib.on('openOrder', function (
                orderId,
                contract,
                order: ORDER,
                orderState: OrderState
            ) {
                // Only check pending orders
                if (
                    ['PendingSubmit', 'PreSubmitted', 'Submitted'].includes(
                        orderState && orderState.status
                    )
                ) {
                    openedOrders = {
                        ...openedOrders,
                        [orderId]: {
                            ...((openedOrders && openedOrders[orderId]) || null),

                            // OrderId + orderState
                            orderId,
                            orderState,

                            // Add order
                            ...order,
                            // Add contract
                            ...contract,
                        },
                    };
                }
            });

            self.ib.reqAllOpenOrders(); // refresh orders

            return setTimeout(handleOpenOrders, timeout || 6000);
        });
    };

    public isActive = (): boolean => {
        return this.receivedOrders;
    };

    /**
     * Place Order
     * Order is added to queue if is already processing one order
     * @stockOrder
     * @options ? {}
     * @when Until IBKR releases a new OrderId, then order is placed and process can pick other orders
     */
    public placeOrder = async (
        stockOrder: OrderStock,
        options?: {unique: boolean}
    ): Promise<any> => {
        const self = this;
        const ib = self.ib;

        const {symbol} = stockOrder;

        const shouldBeUniqueOrder = (options && options.unique) || false;

        const success = (): boolean => {
            ib.off('nextValidId', handleOrderIdNext);
            self.processing = false; // reset processing
            return true;
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const erroredOut = (error?: Error): boolean => {
            ib.off('nextValidId', handleOrderIdNext);
            self.processing = false; // reset processing
            return false;
        };

        const checkPending = (): boolean => {
            // -1 Validate size
            const orderSize = stockOrder.size;

            const orderIsPending = () => {
                log(
                    'placingOrderNow',
                    `*********************** Order is already being processed for ${stockOrder.action} symbol=${symbol} `
                );
                return erroredOut();
            };

            if (Number.isNaN(orderSize)) {
                log(
                    'placingOrderNow.checkPending',
                    `*********************** orderSize is NaN size=${orderSize} action=${stockOrder.action} symbol=${symbol}`
                );
                return erroredOut();
            }

            /**
             * Check existing orders from tickersAndOrders
             */
            const currentOpenOrders = self.tickersAndOrders;

            const currentOpenOrdersSymbolId = currentOpenOrders.filter(
                (cos) => cos.symbol === symbol
            );

            verbose(
                'currentOpenOrdersSymbolId',
                JSON.stringify(currentOpenOrdersSymbolId.map((o) => o.symbol))
            );

            // Should check whether orders  in queue should be unique/ no duplicates
            if (!isEmpty(currentOpenOrdersSymbolId)) {
                const existingOrdersStatuses = currentOpenOrdersSymbolId.map((i) => i.orderStatus);

                const allOrdersThatArePending = existingOrdersStatuses.filter((status) =>
                    ['PreSubmitted', 'Submitted', 'PendingSubmit'].includes(status)
                );

                if (shouldBeUniqueOrder) {
                    if (!isEmpty(allOrdersThatArePending)) {
                        return orderIsPending();
                    }
                }
            }

            /**
             * Check existing opened placed orders
             */
            const checkExistingOrders = Object.keys(self.openOrders).map(
                (key) => self.openOrders[key]
            );

            log(
                'placingOrderNow',
                `Existing orders in queue -> ${(checkExistingOrders || []).map((i) => i.symbol)}`
            );

            if (!isEmpty(checkExistingOrders)) {
                // check if we have the same order from here
                const findMatchingAction = checkExistingOrders.filter(
                    (exi) => exi.action === stockOrder.action && exi.symbol === stockOrder.symbol
                );

                if (!isEmpty(findMatchingAction)) {
                    if (shouldBeUniqueOrder) {
                        log(
                            'placingOrderNow',
                            `Order already exist for ${stockOrder.action}, ${findMatchingAction[0].symbol} ->  @${stockOrder.parameters[0]}`
                        );
                        return erroredOut();
                    }
                }
            }
            return true;
        };

        const handleOrderIdNext = (orderIdNext: number) => {
            const tickerToUse = ++orderIdNext;

            const currentOrders = self.stockOrders;

            if (isEmpty(currentOrders)) {
                log('handleOrderIdNext', `Stock Orders are empty`);
                return erroredOut();
            }

            // get order by it's tickerId
            const stockOrder = self.stockOrders.shift();

            if (isEmpty(stockOrder)) {
                log('handleOrderIdNext', `First Stock Orders Item is empty`);
                return erroredOut();
            }

            const {symbol, size} = stockOrder;

            // eslint-disable-next-line @typescript-eslint/ban-types
            const orderCommand: Function = ib.order[stockOrder.type];

            const args = stockOrder.parameters;

            if (isEmpty(args)) {
                log('handleOrderIdNext', `Arguments cannot be null`);
                return erroredOut();
            }

            // TODO check if orders must be unique else
            // Default to just add it to queue

            const tickerIdWithSymbol = createSymbolAndTickerId(symbol, tickerToUse);

            const oldTickerSymbol = self.tickersAndOrders.find((t) => t.id === tickerIdWithSymbol);

            if (oldTickerSymbol) {
                log('handleOrderIdNext', `Order already exists`);
                return erroredOut();
            }

            // Just save tickerId and stockOrder
            const tickerNOrder: SymbolTickerOrder = {
                id: tickerIdWithSymbol,
                tickerId: tickerToUse,
                symbol,
                orderStatus: 'PendingSubmit',
                stockOrderRequest: stockOrder, // for reference when closing trade,
            };

            // Place order
            ib.placeOrder(
                tickerToUse,
                ib.contract.stock(stockOrder.symbol),
                orderCommand(stockOrder.action, ...args)
            );

            // Add it
            self.tickersAndOrders.push(tickerNOrder);
            self.tickerId = tickerToUse;
            ib.reqAllOpenOrders(); // refresh orders

            log(
                'handleOrderIdNext',
                `Placing order for ... tickerToUse=${tickerToUse} orderIdNext=${orderIdNext} tickerId=${self.tickerId} symbol=${symbol} size=${size}`
            );
            return success();
        };

        function placingOrderNow(): void {
            if (isEmpty(stockOrder.symbol)) {
                erroredOut(new Error('Please enter order'));
                return;
            }

            self.stockOrders.push(stockOrder);
            self.ib.reqIds(++self.orderIdNext);
            verbose(
                'placingOrderNow',
                `Order > placeOrder -> tickerId=${self.tickerId} symbol=${stockOrder.symbol}`
            );
        }

        async function run(): Promise<void> {
            const canProceed = await checkPending();

            if (canProceed === true) {
                if (self.processing) {
                    return log(
                        `Broker is already processing an order for ${self.tickerId}`,
                        symbol
                    );
                }

                // can proceed
                // 1. Processing, or recursive
                // if (self.processing) {
                //     const handleRecursive = setInterval(() => {
                //         log('retry in --------------------->', symbol);
                //         self.placeOrder(stockOrder);
                //     }, 2000);

                //     // save the symbol with it's timeout
                //     self.timeoutRetries[stockOrder.symbol] = compact([
                //         ...(self.timeoutRetries[stockOrder.symbol] || []),
                //         handleRecursive && handleRecursive,
                //     ]);

                //     setTimeout(() => {
                //         clearInterval(handleRecursive);
                //     }, numberOfRetries * retryDelayTime);
                //     return;
                // }

                // Clear all by this symbol
                (self.timeoutRetries[stockOrder.symbol] || []).forEach((uuid) => {
                    clearInterval(uuid);
                });

                // Start -----------------------------
                self.processing = true;

                ib.on('nextValidId', handleOrderIdNext); // start envs
                return placingOrderNow();
            }
        }

        return run();
    };
}

export default Orders;

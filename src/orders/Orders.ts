import IB from '@stoqey/ib';
import isEmpty from 'lodash/isEmpty';
import { ORDER, OrderState, CreateSale, OrderWithContract, OrderStatus, OrderStatusType } from './orders.interfaces';

import { publishDataToTopic, IbkrEvents, IBKREVENTS } from '../events';
import IBKRConnection from '../connection/IBKRConnection';
import { OrderStock } from './orders.interfaces';

import { Portfolios } from '../portfolios';
import { log, verbose } from '../log';

const ibkrEvents = IbkrEvents.Instance;


// Place Order + Cancel Order
// Get Filled open orders


interface SymbolTickerOrder {
    tickerId: number;
    orderPermId: number; // for reference when closing it
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

    /**
     * A ledger of orders that are being executed, 
     * This is to avoid duplicate orders
     * @unique 
     * new order overrides old one
     * only filled, canceled, error orders can be overridden
     */
    symbolsTickerOrder: { [x: string]: SymbolTickerOrder } = {}


    /**
     * Redundant orderIdNext recorded
     */
    orderIdNext: number = null;

    // OPEN ORDERS
    public openOrders: { [x: string]: OrderWithContract } = {};
    public receivedOrders: boolean = false; // stopper 

    private static _instance: Orders;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const self = this;

        // only when connected createSale
        ibkrEvents.on(IBKREVENTS.CONNECTED, async (sale: CreateSale) => {
            self.init();
        });

        ibkrEvents.emit(IBKREVENTS.PING); // ping connection
    }

    /**
     * init
     */
    public init = async (): Promise<void> => {
        let self = this;

        if (!self.ib) {
            const ib = IBKRConnection.Instance.getIBKR();
            self.ib = ib;


            ib.on('openOrderEnd', () => {
                verbose(`Orders > init > openOrderEnd`, ` ->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
                // Initialise OrderTrader
                // OrderTrade.Instance.init();

                const openOrders = Object.keys(self.openOrders).map(key => self.openOrders[key]);

                publishDataToTopic({
                    topic: IBKREVENTS.OPEN_ORDERS,
                    data: openOrders,
                });

            })

            ib.on('orderStatus', (id, status, filled, remaining, avgFillPrice, permId,
                parentId, lastFillPrice, clientId, whyHeld) => {

                const currentOrder = self.openOrders[id];

                const orderStatus: OrderStatus = {
                    status, filled, remaining, avgFillPrice, permId,
                    parentId, lastFillPrice, clientId, whyHeld
                }

                publishDataToTopic({
                    topic: IBKREVENTS.ORDER_STATUS, //push to topic below,
                    data: {
                        order: currentOrder,
                        orderStatus
                    }
                });

                log(`Orders > orderStatus`, {
                    id,
                    status,
                    filled,
                    remaining,
                    symbol: currentOrder && currentOrder.symbol
                })
            });

            ib.on('openOrder', function (orderId, contract, order: ORDER, orderState: OrderState) {
                log(`Order> openOrder`, ` -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`);


                // 1. Update OpenOrders
                // Orders that need to be filled
                // -----------------------------------------------------------------------------------
                self.receivedOrders = true;

                let openOrders = self.openOrders;

                self.openOrders = {
                    ...openOrders,
                    [orderId]: {
                        ...(openOrders && openOrders[orderId] || null),

                        // OrderId + orderState
                        orderId,
                        orderState,

                        // Add order
                        ...order,
                        // Add contract
                        ...contract
                    }
                };
                //  Delete order from openOrders list
                if (orderState.status === "Filled") {
                    log(`Filled -----> DELETE FROM OPEN ORDERS -------> ${JSON.stringify(contract)}`);
                    delete self.openOrders[orderId];
                }

                const openOrdersArr = Object.keys(self.openOrders).map(key => self.openOrders[key]);
                log(`OPEN ORDERS ${openOrdersArr && openOrdersArr.length}`);
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


                // 2. Update OrderStocks
                // Orders requests to send to transmit
                // Using ticker Ids
                // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
                const allTickerOrder: SymbolTickerOrder[] = Object.keys(self.symbolsTickerOrder).map(key => self.symbolsTickerOrder[key]);

                const thisOrderTicker = allTickerOrder.find(tickerOrder => tickerOrder.tickerId === orderId);

                // Add permId to orderTickObject
                if (!isEmpty(thisOrderTicker)) {

                    // update this symbolTickerOrder
                    self.symbolsTickerOrder[thisOrderTicker.symbol] = {
                        ...(self.symbolsTickerOrder[thisOrderTicker.symbol] || null),
                        orderPermId: order.permId,
                        symbol: thisOrderTicker.symbol,
                        orderStatus: orderState.status, // update order state
                    };

                    const updatedSymbolTicker = self.symbolsTickerOrder[thisOrderTicker.symbol];

                    // create sale if order is filled
                    if (orderState.status === "Filled") {
                        // Order is filled we can record it
                        // Check if we can create new trade
                        // on if stockOrderRequest is present
                        // that.symbolsTickerOrder[thisOrderTicker.symbol]
                        if (!isEmpty(updatedSymbolTicker.stockOrderRequest)) {

                            const { stockOrderRequest } = updatedSymbolTicker;
                            const { exitTrade, exitParams, symbol, capital } = stockOrderRequest;

                            const dataSaleSymbolOrder: OrderWithContract = {
                                ...order,
                                ...contract,
                                orderState,
                                orderId
                            }

                            if (exitTrade) {
                                const { exitPrice, exitTime, entryTime, entryPrice } = exitParams;
                                // If this trade is for exiting then record the sale
                                // create sale now
                                const newSale: CreateSale = {
                                    capital,
                                    exitPrice,
                                    exitTime,
                                    entryTime,
                                    entryPrice,
                                    symbol,
                                    profit: entryPrice - exitPrice
                                };

                                log(`AccountOrderStock.openOrder`, `FILLED, TO CREATE SALE -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`);

                                return publishDataToTopic({
                                    topic: IBKREVENTS.ORDER_FILLED,
                                    data: { sale: newSale, order: dataSaleSymbolOrder }
                                })
                            }

                            log(`AccountOrderStock.openOrder`, `FILLED, but no sale created -> ${contract.symbol} ${order.action} ${order.totalQuantity}  ${orderState.status}`);

                            publishDataToTopic({
                                topic: IBKREVENTS.ORDER_FILLED,
                                data: { sale: null, order: dataSaleSymbolOrder }
                            })

                        }
                    }


                }




            });


            // placeOrder event
            ibkrEvents.on(IBKREVENTS.PLACE_ORDER, async ({ stockOrder }: { stockOrder: OrderStock }) => {
                await self.placeOrder(stockOrder);
            })
        }


    }

    /**
     *  reqAllOpenOrders
     */
    private reqAllOpenOrders = (): void => {

        const that = this;

        setImmediate(() => {
            if (that.ib) {
                console.log(`Orders > reqAllOpenOrders `)
                that.ib.reqAllOpenOrders();
            }
        })

    }

    public getOpenOrders = async (timeout?: number): Promise<OrderWithContract[]> => {

        const self = this;

        return new Promise((resolve, reject) => {

            let done = false;

            // listen for account summary
            const handleOpenOrders = (ordersData) => {
                if (!done) {
                    ibkrEvents.off(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
                    done = true;
                    resolve(ordersData);
                }
            }

            ibkrEvents.on(IBKREVENTS.OPEN_ORDERS, handleOpenOrders);
            self.reqAllOpenOrders(); // refresh orders

            return setTimeout(handleOpenOrders, timeout || 6000);
        })
    }

    public isActive = (): boolean => {
        return this.receivedOrders;
    }

    /**
     * Place Order
     * Order is added to queue if is already processing one order
     * @when Until IBKR releases a new OrderId, then order is placed and process can picker other orders
     * @stockOrder
     * @options ? {}
     */
    public placeOrder = async (stockOrder: OrderStock, options?: { retryCounts?: number, retryTime?: number }): Promise<void | any> => {

        let self = this;
        const ib = self.ib;

        const { exitTrade, symbol } = stockOrder;

        let numberOfRetries = 3;
        let retryDelayTime = 2000;
        // options
        if (options) {
            numberOfRetries = options.retryCounts || numberOfRetries;
            retryDelayTime = options.retryTime || retryDelayTime;
        }


        let handleRecursive;

        // 1. Processing, or recursive
        if (self.processing) {
            handleRecursive = setInterval(
                () => {
                    console.log('retry in --------------------->', symbol)
                    self.placeOrder(stockOrder)
                }
                , 2000)
            return setTimeout(() => clearInterval(handleRecursive), numberOfRetries * retryDelayTime)
        }

        // clear recursive
        clearInterval(handleRecursive)
        handleRecursive = 0;

        // Start -----------------------------
        this.processing = true;


        const success = (): void => {
            ib.off('nextValidId', handleOrderIdNext);
            self.processing = false; // reset processing
            return;
        };


        const handleOrderIdNext = (orderIdNext: number) => {

            const tickerToUse = ++orderIdNext;

            const currentOrders = self.stockOrders;

            if (isEmpty(currentOrders)) {
                log('handleOrderIdNext', `Stock Orders are empty`);
                return success();
            }

            // get order by it's tickerId
            const stockOrder = self.stockOrders.shift();


            if (isEmpty(stockOrder)) {
                log('handleOrderIdNext', `First Stock Orders Item is empty`);
                return success();
            }

            const { symbol } = stockOrder;

            const orderCommand: Function = ib.order[stockOrder.type];

            const args = stockOrder.parameters;

            if (isEmpty(args)) {
                log('handleOrderIdNext', `Arguments cannot be null`);
                return success();
            }

            // Just save tickerId and stockOrder
            self.symbolsTickerOrder[symbol] = {
                ...(self.symbolsTickerOrder[symbol] || null),
                tickerId: tickerToUse,
                symbol,
                orderStatus: "PendingSubmit",
                stockOrderRequest: stockOrder // for reference when closing trade,
            };

            // Place order
            ib.placeOrder(tickerToUse, ib.contract.stock(stockOrder.symbol), orderCommand(stockOrder.action, ...args));

            // self.orderIdNext = tickerToUse;
            self.tickerId = tickerToUse;
            ib.reqAllOpenOrders(); // refresh orders

            log('handleOrderIdNext', `Placing order for ... tickerToUse=${tickerToUse} orderIdNext=${orderIdNext} tickerId=${self.tickerId} ${symbol}`);
            return success();
        }


        async function placingOrderNow(): Promise<void> {
            if (isEmpty(stockOrder.symbol)) {
                return console.log(new Error("Please enter order"))
            }

            // 0. Pending orders
            // Check active tickerSymbols
            const pendingOrders = self.symbolsTickerOrder[symbol];
            const pendingOrderStatus = pendingOrders && pendingOrders.orderStatus;
            const isPending = ['PreSubmitted', 'Submitted', 'PendingSubmit'].includes(pendingOrderStatus);

            if (isPending) {
                log('placingOrderNow', `*********************** Order is already being processed for ${stockOrder.action} symbol=${symbol} pendingOrderStatus=${pendingOrderStatus || "NONE"} isPending=${isPending}`);
                return success();
            }


            // 1. Check existing open orders
            const checkExistingOrders = await self.getOpenOrders();

            log('placingOrderNow', `Existing orders in queue -> ${checkExistingOrders.map(i => i.symbol)}`)

            if (!isEmpty(checkExistingOrders)) {
                // check if we have the same order from here
                const findMatchingAction = checkExistingOrders.filter(
                    exi =>
                        exi.action === stockOrder.action &&
                        exi.symbol === stockOrder.symbol
                );

                if (!isEmpty(findMatchingAction)) {
                    log('placingOrderNow', `Order already exist for ${stockOrder.action}, ${findMatchingAction[0].symbol} ->  @${stockOrder.parameters[0]}`)
                    return success();
                }
            }


            // 2. Check existing portfolios
            const checkExistingPositions = await Portfolios.Instance.getPortfolios();
            verbose('placingOrderNow', `Existing portfolios -> ${JSON.stringify(checkExistingPositions.map(i => i.symbol))}`);

            const foundExistingPortfolios = !isEmpty(checkExistingPositions) ? checkExistingPositions.filter(
                exi => exi.symbol === stockOrder.symbol) : [];

            verbose('placingOrderNow', `foundExistingPortfolios -> ${JSON.stringify(foundExistingPortfolios.map(i => i.symbol))}`);

            if (!isEmpty(foundExistingPortfolios)) {

                // Only if this is not exit
                if (!exitTrade) {
                    log('placingOrderNow', `*********************** Portfolio already exist and has position for ${stockOrder.action}, order=${JSON.stringify(foundExistingPortfolios.map(i => i.symbol))}`)
                    return success();
                }
                // Else existing trades are allowed
            }

            self.stockOrders = [...self.stockOrders, stockOrder];
            self.ib.reqIds(++self.orderIdNext);

            verbose('placingOrderNow', `Order > placeOrder -> tickerId=${self.tickerId} symbol=${stockOrder.symbol}`)

        }

        ib.on('nextValidId', handleOrderIdNext); // start envs
        return placingOrderNow();
    }
}

export default Orders;
import { Subscription, catchError, firstValueFrom, of } from 'rxjs';
import { IBApiNext, OpenOrder, Order, Contract, OrderCancel, OrderStatus, OrderType } from '@stoqey/ib';
import IBKRConnection, { isMarketDataOnly } from '../connection/IBKRConnection';
import identity from 'lodash/identity';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import { log, warn } from '../utils/log';
import awaitP from '../utils/awaitP';
import { Instrument, Trade as SSTrade, OrderAction as SsOrderAction } from '../interfaces';
import Portfolios from '../portfolios/Portfolios';
import { ContractInstrument } from '../marketdata/MarketDataManager';
import { getSymbolKey } from '../utils/instrument.utils';
import { Mutex } from 'async-mutex';
import { logOrder } from '../utils/log.utils';
import { IBKREvents, IBKREVENTS } from '../events';
import { getContractFilterLabel, isContractAllowed } from '../utils/contract-filter.utils';

const ibkrEvents = IBKREvents.Instance;

const ACTIVE_OPEN_ORDER_STATUSES = new Set<OrderStatus>([
    OrderStatus.PendingCancel,
    OrderStatus.PendingSubmit,
    OrderStatus.ApiPending,
    OrderStatus.Unknown,
    OrderStatus.PreSubmitted,
    OrderStatus.Submitted,
]);

export class Orders {
    ib: IBApiNext = null;

    private GetOrders: Subscription;

    private openOrders: Map<number, OpenOrder> = new Map();
    private cancelledOrders: Map<number, OpenOrder> = new Map();

    private completedTrades: Map<number, SSTrade> = new Map();

    private openOrderQueue: OpenOrder[] = [];

    mutex = new Mutex();

    private static _instance: Orders;

    public static get Instance(): Orders {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    get orders(): OpenOrder[] {
        return Array.from(this.openOrders.values()).filter(this.isActiveOpenOrder);
    }

    get trades(): SSTrade[] {
        return Array.from(this.completedTrades.values());
    }

    /**
     * getOrders
     */
    getOrders = (): Promise<OpenOrder[]> => {
        return this.asyncOpenOrders();
    }

    logOpenOrder = (title: string, openOrder: OpenOrder) => {
        try {
            const { contract, order } = openOrder;
            const symbol = getSymbolKey(contract);
            const { permId = "", action = "", totalQuantity = 0, orderType = "", lmtPrice, auxPrice } = order || {} as any;
            const avgFillPrice = openOrder.orderStatus?.avgFillPrice;
            const status = openOrder.orderStatus?.status;
            // TODO: Print order price based on type since stop-market orders have `lmtPrice: 0` and limit orders have `auxPrice: 0` (which is valid for options though).
            log(`Orders.${title} symbol=${symbol} permId=${permId}`, `${action} ${totalQuantity} ${orderType} @${avgFillPrice ?? lmtPrice ?? auxPrice ?? 0} => ${status}`);
        }
        catch (error) {
        }
    };

    private getOrderStatus = (order: OpenOrder): OrderStatus => {
        return order?.orderState?.status || order?.orderStatus?.status;
    }

    private getPermId = (order: OpenOrder): number => {
        return order?.order?.permId;
    }

    private isActiveOpenOrder = (order: OpenOrder): boolean => {
        const orderStatus = this.getOrderStatus(order);
        return ACTIVE_OPEN_ORDER_STATUSES.has(orderStatus) && isContractAllowed(order?.contract, "orders");
    }

    processOrderQueue = async () => {
        if (isMarketDataOnly()) {
            log("Orders.processOrderQueue", "MD_ONLY enabled, skipping order queue processing");
            return;
        }
        const portfoliosManager = Portfolios.Instance;
        await portfoliosManager.init();

        const processedQueue = await this.mutex.runExclusive(async () => {
            let processedQueue = false;

            while (this.openOrderQueue.length > 0) {
                processedQueue = true;
                const order = this.openOrderQueue.shift();
                const contractId = order?.contract?.conId;
                const permId = this.getPermId(order);

                if (!order || permId === undefined || permId === null) {
                    continue;
                }

                if (!isContractAllowed(order.contract, "orders")) {
                    this.openOrders.delete(permId);
                    continue;
                }

                // Ignore if already Filled processed / completed
                if (this.completedTrades.has(permId)) {
                    continue;
                };

                // Ignore cancelled orders
                if (this.cancelledOrders.has(permId)) {
                    continue;
                }

                this.logOpenOrder("processOrderQueue", order);

                const orderStatus = this.getOrderStatus(order);

                // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract ${orderStatus}`);
                switch (orderStatus) {
                    case OrderStatus.Filled:

                        const entryPrice =
                            portfoliosManager.getEntryPrice(contractId) ?? //  
                            portfoliosManager.getLatestClosedPosition(contractId)?.avgCost ??
                            order.orderStatus.avgFillPrice;

                        const entryDate =
                            portfoliosManager.getEntryDate(contractId) ??
                            portfoliosManager.getLatestClosedPosition(contractId)?.entryDate ??
                            new Date(); // for new positions

                        const trade: SSTrade = {
                            id: `${order.order.orderId}`,
                            instrument: order.contract as Instrument,
                            entryPrice,
                            entryDate,
                            type: order.order.orderType as any,
                            price: order.orderStatus.avgFillPrice,
                            quantity: order.order.totalQuantity,
                            action: order.order.action as SsOrderAction,
                            date: new Date()
                        };

                        if (!this.completedTrades.has(permId)) {
                            this.completedTrades.set(permId, trade);
                            ibkrEvents.emit(IBKREVENTS.IBKR_SAVE_TRADE, trade);
                            ibkrEvents.emit(IBKREVENTS.IBKR_COMPLETED_TRADES_UPDATED, { updatedAt: Date.now() });
                        }

                        this.openOrders.delete(permId);

                        break;
                    case OrderStatus.ApiCancelled:
                    case OrderStatus.Cancelled:
                        this.openOrders.delete(permId);
                        this.cancelledOrders.set(permId, order);
                    
                        break;
                    case OrderStatus.Inactive:
                        this.openOrders.delete(permId);

                        break;
                    case OrderStatus.PendingCancel:
                    case OrderStatus.PendingSubmit:
                    case OrderStatus.ApiPending:
                    case OrderStatus.Unknown:
                    case OrderStatus.PreSubmitted:
                    case OrderStatus.Submitted:
                        this.openOrders.set(permId, order);

                        break;
                    default:

                        break;
                }
              
            }

            return processedQueue;
        });

        if (processedQueue) {
            ibkrEvents.emit(IBKREVENTS.IBKR_OPEN_ORDERS_UPDATED, { updatedAt: Date.now() });
        }
    }

    /**
     * getOpenOrders
     */
    asyncOpenOrders = async (): Promise<OpenOrder[]> => {
        if (isMarketDataOnly()) {
            log("Orders.asyncOpenOrders", "MD_ONLY enabled, skipping open order snapshot");
            return [];
        }
        const openOrders = await firstValueFrom(this.ib.getOpenOrders());

        openOrders.all.forEach((order) => {
            if (!order) {
                return;
            }
            this.openOrderQueue.push(order);
        });

        await this.processOrderQueue();

        return this.orders;
    }

    syncOpenOrders = (): void => {
        if (isMarketDataOnly()) {
            log("Orders.syncOpenOrders", "MD_ONLY enabled, skipping open order subscription");
            return;
        }
        const portfoliosManager = Portfolios.Instance;
        portfoliosManager.init();
        if (this.GetOrders && !this.GetOrders.closed) {
            log("Orders.syncOpenOrders", "open orders subscription already active");
            return;
        }

        const subscription = this.ib.getAutoOpenOrders(true)
        .pipe(
            catchError((error) => {
                warn(`syncOpenOrders`, `Error subscribing to open orders`, error);
                this.GetOrders = undefined;
                return of(null);
            })
        )
        .subscribe((openOrders) => {
            if (!openOrders) {
                return;
            }
            openOrders.all.forEach((order) => {
                if (!order) {
                    return;
                }
                this.openOrderQueue.push(order);
            });
            this.processOrderQueue();
        });
        this.GetOrders = subscription.closed ? undefined : subscription;
    }

    /**
     * init
     */
    public init = async (): Promise<void> => {
        if (isMarketDataOnly()) {
            log("Orders.init", "MD_ONLY enabled, skipping orders init");
            return;
        }
        const self = this;

        const ib = IBKRConnection.Instance.ib;
        self.ib = ib;

        this.syncOpenOrders();
    };

    parseOrder = (orderPlaced: Order, contractDetails: ContractInstrument): { order: Order, contract: Contract } => {
        if (contractDetails?.minTick) {
            if (orderPlaced?.orderType === OrderType.STP_LMT || orderPlaced?.orderType === OrderType.LMT) {
                if (orderPlaced?.lmtPrice) {
                    orderPlaced.lmtPrice = Number((Math.round(orderPlaced.lmtPrice / contractDetails.minTick) * contractDetails.minTick).toFixed(2));
                }
            }
            else {
                delete orderPlaced.lmtPrice;
            }

            if (orderPlaced?.auxPrice) {
                orderPlaced.auxPrice = Number((Math.round(orderPlaced.auxPrice / contractDetails.minTick) * contractDetails.minTick).toFixed(2));
            }
        };

        const contract = pickBy(omit(contractDetails.contract, ["primaryExch"]), identity);

        const order = pickBy(orderPlaced, identity);

        return { order, contract };
    }

    /**
     * placeOrder
     */
    placeOrder = async (contractDetails: ContractInstrument, orderToPlace: Order): Promise<boolean> => {

        const { order, contract } = this.parseOrder(orderToPlace, contractDetails);
        if (!isContractAllowed(contractDetails, "orders")) {
            logOrder(`Orders.placeOrder Contract filtered by IBKR contract filter=${getContractFilterLabel("orders")}`, { order, contract }, true);
            return false;
        }

        logOrder(`Orders.placeOrder Placing order ${order.orderId || ""}`, { order, contract });

        const [orderPlaced, error] = await awaitP(this.ib.placeNewOrder(contractDetails, order));
        if (error) {
            logOrder(`Orders.placeOrder Error placing order ${error}`, { order, contract }, true);
            return;
        }
        if (orderPlaced) {
            // TODO save order tick, entry
            logOrder(`Orders.placeOrder Order placed id=${orderPlaced || order.orderId}`, { order, contract });
            return true;
        }
        logOrder(`Orders.placeOrder Order NOT placed ${order.orderId || ""}`, { order, contract }, true);
        return false;
    }

    /**
     * modifyOrder
     */
    modifyOrder = async (id: number, contractDetails: ContractInstrument, orderToPlace: Order): Promise<boolean> => {
        try {
            const { order, contract } = this.parseOrder(orderToPlace, contractDetails);
            if (!isContractAllowed(contractDetails, "orders")) {
                logOrder(`Orders.modifyOrder Contract filtered by IBKR contract filter=${getContractFilterLabel("orders")}`, { order, contract }, true);
                return false;
            }

            this.ib.modifyOrder(id, contractDetails, order)
            // TODO save order tick, entry
            logOrder(`Orders.modifyOrder ${id}`, { order, contract });
            return true;
        }
        catch (e) {
            log(`Orders.modifyOrder`, `Error modifying order ${id}`);
            return false;
        }
    }

    cancelOrder = async (orderId: number, orderCancel?: string | OrderCancel): Promise<boolean> => {
        try {
            this.ib.cancelOrder(orderId, orderCancel)
            // TODO save order tick, entry
            log(`Orders.cancelOrder`, `Order cancelled ${orderId}`);
            return true;
        }
        catch (e) {
            log(`Orders.cancelOrder`, `Error modifying order ${orderId}`);
            return false;
        }
    }

    cancelAllOrders = async (orderCancel: OrderCancel): Promise<boolean> => {
        try {
            this.ib.cancelAllOrders(orderCancel);
            // TODO save order tick, entry
            log(`Orders.cancelAllOrders`, `Order placed ${orderCancel}`);
            return true;
        }
        catch (e) {
            log(`Orders.cancelAllOrders`, `Error modifying order ${orderCancel}`);
            return false;
        }
    }


}

export default Orders;

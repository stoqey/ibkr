import { Subscription, firstValueFrom } from 'rxjs';
import { IBApiNext, OpenOrder, Order, Contract, OrderCancel, OrderStatus, OrderType } from '@stoqey/ib';
import IBKRConnection from '../connection/IBKRConnection';
import compact from 'lodash/compact';
import identity from 'lodash/identity';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import { log } from '../utils/log';
import awaitP from '../utils/awaitP';
import { Instrument, Trade as SSTrade, OrderAction as SsOrderAction } from '../interfaces';
import Portfolios from '../portfolios/Portfolios';
import { ContractInstrument } from '../marketdata/MarketDataManager';
import { getSymbolKey } from '../utils/instrument.utils';
import { Mutex } from 'async-mutex';
import { logOrder } from '../utils/log.utils';
import { IBKREvents, IBKREVENTS } from '../events';

const ibkrEvents = IBKREvents.Instance;
export class Orders {
    ib: IBApiNext = null;

    // permIdNext: number = null;

    private GetOrders: Subscription;

    private openOrders: Map<number, OpenOrder> = new Map();
    private cancelledOrders: Map<number, OpenOrder> = new Map();

    private completedTrades: Map<string, SSTrade> = new Map();

    private openOrderQueue: OpenOrder[] = [];

    mutex = new Mutex();

    private static _instance: Orders;

    public static get Instance(): Orders {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    get orders(): OpenOrder[] {
        return Array.from(this.openOrders.values());
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

    processOrderQueue = async () => {
        const portfoliosManager = Portfolios.Instance;
        await portfoliosManager.init();

        await this.mutex.runExclusive(async () => {
            while (this.openOrderQueue.length > 0) {
                const order = this.openOrderQueue.shift();
                const contractId = order?.contract?.conId;
                const permId = order?.order?.permId;

                // Ignore if already Filled processed / completed
                if (this.completedTrades.has(`${permId}`)) {
                    continue;
                };

                // ignore cancelled orders
                if (this.cancelledOrders.has(permId)) {
                    continue;
                }

                // ignore pre - submitted orders but update it in openOrders
                if (order?.orderState?.status === OrderStatus.PreSubmitted) {
                    this.openOrders.set(contractId, order);
                    continue;
                };

                // no logs here ------------------------------------------------
                // no logs here ------------------------------------------------

                this.logOpenOrder("processOrderQueue", order);

                if (contractId) {
                    this.openOrders.set(contractId, order);
                };

                switch (order.orderState?.status || order.orderStatus?.status) {
                    case OrderStatus.Filled:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract filled`);

                        const entryPrice =
                            portfoliosManager.getEntryPrice(contractId) ?? //  
                            portfoliosManager.getLatestClosedPosition(contractId)?.avgCost ??
                            order.orderStatus.avgFillPrice;

                        const trade: SSTrade = {
                            id: `${order.order.permId}`,
                            instrument: order.contract as Instrument,
                            entryPrice,
                            type: order.order.orderType as any,
                            price: order.orderStatus.avgFillPrice,
                            quantity: order.order.totalQuantity,
                            action: order.order.action as SsOrderAction,
                            date: new Date(),
                        };

                        if (!this.completedTrades.has(trade.id)) {
                            this.completedTrades.set(trade.id, trade);
                            ibkrEvents.emit(IBKREVENTS.IBKR_SAVE_TRADE, trade);
                        }

                        if (contractId) this.openOrders.delete(contractId);

                        break;
                    case OrderStatus.ApiCancelled:
                    case OrderStatus.Cancelled:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  cancelled`);
                        if (contractId) {
                            this.openOrders.delete(contractId);
                            if(!this.cancelledOrders.has(permId)){
                                this.cancelledOrders.set(permId, order);
                            }
                        };
                    
                        break;
                    case OrderStatus.Submitted:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  submitted`);
                        break;
                    case OrderStatus.Inactive:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  inactive`);
                        break;
                    case OrderStatus.PendingCancel:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  pending cancel`);
                        break;
                    case OrderStatus.PendingSubmit:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  pending submit`);
                        break;
                    case OrderStatus.ApiPending:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  api pending`);
                        break;
                    case OrderStatus.PreSubmitted:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  pre submitted`);
                        break;
                    case OrderStatus.Unknown:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  unknown`);
                        break;
                    default:
                        // log(`Orders.syncOpenOrders`, `Order ${order.permId} for contract  in an unknown state`);
                        break;
                }
            }
        });
    }

    /**
     * getOpenOrders
     */
    asyncOpenOrders = async (): Promise<OpenOrder[]> => {
        const openOrders = await firstValueFrom(this.ib.getOpenOrders());

        const orders: OpenOrder[] = compact(openOrders.all.map((order) => {
            if (!order) {
                return;
            }
            this.openOrderQueue.push(order);
            return order;
        }));

        await this.processOrderQueue();

        return orders;
    }

    syncOpenOrders = (): void => {
        const portfoliosManager = Portfolios.Instance;
        portfoliosManager.init();

        this.GetOrders = this.ib.getAutoOpenOrders(true).subscribe((openOrders) => {
            openOrders.all.forEach((order) => {
                if (!order) {
                    return;
                }
                this.openOrderQueue.push(order);
            });
            this.processOrderQueue();
        });
    }

    /**
     * init
     */
    public init = async (): Promise<void> => {
        const self = this;

        if (!self.ib) {
            const ib = IBKRConnection.Instance.ib;
            self.ib = ib;

            this.syncOpenOrders();
        }
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
        logOrder(`Orders.placeOrder Placing order ${order.permId || ""}`, { order, contract });

        const [orderPlaced, error] = await awaitP(this.ib.placeNewOrder(contractDetails, order));
        if (error) {
            logOrder(`Orders.placeOrder Error placing order ${error}`, { order, contract }, true);
            return;
        }
        if (orderPlaced) {
            // TODO save order tick, entry
            logOrder(`Orders.placeOrder Order placed id=${orderPlaced || order.permId}`, { order, contract });
            return true;
        }
        logOrder(`Orders.placeOrder Order NOT placed ${order.permId || ""}`, { order, contract }, true);
        return false;
    }

    /**
     * modifyOrder
     */
    modifyOrder = async (id: number, contractDetails: ContractInstrument, orderToPlace: Order): Promise<boolean> => {
        try {
            const { order, contract } = this.parseOrder(orderToPlace, contractDetails);
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

    cancelOrder = async (permId: number, orderCancel?: string | OrderCancel): Promise<boolean> => {
        try {
            this.ib.cancelOrder(permId, orderCancel)
            // TODO save order tick, entry
            log(`Orders.cancelOrder`, `Order cancelled ${permId}`);
            return true;
        }
        catch (e) {
            log(`Orders.cancelOrder`, `Error modifying order ${permId}`);
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
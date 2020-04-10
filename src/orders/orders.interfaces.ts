import { ContractObject } from "../contracts";

export type action = 'BUY' | 'SELL';

// https://interactivebrokers.github.io/tws-api/interfaceIBApi_1_1EWrapper.html#a17f2a02d6449710b6394d0266a353313
type OrderStatus =
    'PendingSubmit' // indicates that you have transmitted the order, but have not yet received confirmation that it has been accepted by the order destination.
    | 'PendingCancel' // PendingCancel - indicates that you have sent a request to cancel the order but have not yet received cancel confirmation from the order destination. At this point, your order is not confirmed canceled. It is not guaranteed that the cancellation will be successful.
    | 'PreSubmitted' //
    | 'Submitted' //
    | 'ApiCancelled' //
    | 'Cancelled'
    | 'Filled';

export interface ORDER {
    orderId: number;
    action: action;
    totalQuantity: number;
    orderType: string;
    lmtPrice: number;
    auxPrice: number;
    tif: string;
    ocaGroup: string;
    account: string;
    openClose: string;
    origin: number;
    orderRef: string;
    clientId: number;
    permId: number;
    outsideRth: boolean;
    hidden: boolean;
    discretionaryAmt: number;
    goodAfterTime: string;
    faGroup: string;
    faMethod: string;
    faPercentage: string;
    faProfile: string;
    goodTillDate: string;
    rule80A: string;
    percentOffset: number;
    settlingFirm: string;
    shortSaleSlot: number;
    designatedLocation: string;
    exemptCode: number;
    auctionStrategy: number;
    startingPrice: number;
    stockRefPrice: number;
    delta: number;
    stockRangeLower: number;
    stockRangeUpper: number;
    displaySize?: any;
    blockOrder: boolean;
    sweepToFill: boolean;
    allOrNone: boolean;
    minQty: number;
    ocaType: number;
    eTradeOnly: boolean;
    firmQuoteOnly: boolean;
    nbboPriceCap: number;
    parentId: number;
    triggerMethod: number;
    volatility: number;
    volatilityType: number;
    deltaNeutralOrderType: string;
    deltaNeutralAuxPrice: number;
    deltaNeutralConId: number;
    deltaNeutralSettlingFirm: string;
    deltaNeutralClearingAccount: string;
    deltaNeutralClearingIntent: string;
    deltaNeutralOpenClose: string;
    deltaNeutralShortSale: boolean;
    deltaNeutralShortSaleSlot: number;
    deltaNeutralDesignatedLocation: string;
    continuousUpdate: number;
    referencePriceType: number;
    trailStopPrice: number;
    trailingPercent: number;
    basisPoints: number;
    basisPointsType: number;
    scaleInitLevelSize: number;
    scaleSubsLevelSize: number;
    scalePriceIncrement: number;
    hedgeType: string;
    optOutSmartRouting: boolean;
    clearingAccount: string;
    clearingIntent: string;
    notHeld: boolean;
    algoStrategy: string;
    whatIf: boolean;
}

export interface OrderWithContract extends ORDER, ContractObject {
    orderId: number,
    orderState: OrderState,
};


export interface OrderState {
    status: OrderStatus;
    initMargin: string;
    maintMargin: string;
    equityWithLoan: string;
    commission: number;
    minCommission: number;
    maxCommission: number;
    commissionCurrency: string;
    warningText: string;
}


// ORDER TRADE
export type OrderAction = 'BUY' | 'SELL';

export type OrderType =
    'limit' // ib.order.limit('SELL', 1, 9999)
    | 'market' // .order.market(action, quantity, transmitOrder, goodAfterTime, goodTillDate)
    | 'marketClose' // .order.marketClose(action, quantity, price, transmitOrder)
    | 'stop' // .order.stop(action, quantity, price, transmitOrder, parentId, tif)
    | 'stopLimit' // .order.stopLimit(action, quantity, limitPrice, stopPrice, transmitOrder, parentId, tif)
    | 'trailingStop' // .order.trailingStop(action, quantity, auxPrice, tif, transmitOrder, parentId)

export interface OrderStock {
    symbol: string;
    action: OrderAction;
    type: OrderType;
    parameters: any[]; // 'SELL', 1, 9999,
    size?: number;
    capital?: number;
    exitTrade: boolean;
    exitParams?: {
        /**
         * When exiting a trade
         * Create sale
         */
        entryTime: Date;
        entryPrice: number;
        exitTime: Date;
        exitPrice: number;
    },
}


// CREATE Sale
export interface CreateSale {
    entryPrice: number;
    entryTime: Date;
    exitTime: Date;
    exitPrice: number;
    symbol: string;
    capital: number;
    profit?: number;
    website?: string;
    industry?: string;
    shortName?: string;
}

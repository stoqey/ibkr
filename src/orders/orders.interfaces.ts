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
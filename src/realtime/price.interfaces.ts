export type TickPrice =
    | 'BID'
    | 'ASK'
    | 'LAST'
    | 'HIGH'
    | 'LOW'
    | 'CLOSE'
    | 'OPEN'
    | 'DELAYED_BID'
    | 'DELAYED_ASK'
    | 'DELAYED_LAST'
    | 'DELAYED_HIGH'
    | 'DELAYED_LOW'
    | 'DELAYED_VOLUME'
    | 'DELAYED_CLOSE'
    | 'DELAYED_OPEN';

export type TickSize = 'BID_SIZE' | 'ASK_SIZE' | 'LAST_SIZE' | 'VOLUME';

export interface SymbolWithData {
    symbol: string;

    price: {
        BID?: number;
        ASK?: number;
        LAST?: number;
        HIGH?: number;
        LOW?: number;
        CLOSE: number;
        OPEN?: number;
    };
    size?: {
        BID_SIZE: number;
        ASK_SIZE: number;
        LAST_SIZE: number;
        VOLUME: number;
    };
}

export interface PriceUpdatesEvent {
    readonly tickType: TickPrice;
    readonly symbol: string;
    readonly price: number | null;
    readonly date: Date;
}

export type TickPrice = 'BID' | 'ASK' | 'LAST' | 'HIGH' | 'LOW' | 'CLOSE' | 'OPEN';

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

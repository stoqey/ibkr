import { Subscription, firstValueFrom } from 'rxjs';
import { Position, IBApiNext, WhatToShow, BarSizeSetting } from '@stoqey/ib';
import { IBKRConnection } from '../connection';
import compact from 'lodash/compact';
import MarketDataManager from '../marketdata/MarketDataManager';
import { logPosition } from '../utils/log.utils';

export class Portfolios {
    ib: IBApiNext;
    private static _instance: Portfolios;

    private currentPortfolios: Map<number, Position> = new Map();
    private closedPositions: Map<number, Position> = new Map();
    private entryPrices: Map<number, number> = new Map();

    private GetPositions: Subscription;

    public static get Instance(): Portfolios {
        return this._instance || (this._instance = new this());
    }

    private constructor() { }

    get positions(): Position[] {
        return Array.from(this.currentPortfolios.values());
    }

    updateMarketPrice = (conId: number, close: number): void => {
        const position = this.currentPortfolios?.get(conId);
        if (position) {
            const newPosition = { ...position };
            newPosition.marketPrice = close;
            this.currentPortfolios.set(conId, newPosition);
        }
    };

    getEntryPrice = (conId: number): number | undefined => {
        return this.entryPrices.get(conId);
    }

    getLatestClosedPosition(conId: number): Position | undefined {
        return this.closedPositions.get(conId);
    }

    mapPositions = (positionOg: Position, subscribe = false): Position => {
        if (!positionOg) {
            return;
        }

        let position: any = { ...positionOg };

        const contractId = position?.contract?.conId;
        if (contractId) {
            if (position.contract.exchange === "VALUE") {
                return;
            }

            if (!position.pos) {
                const positionToClose = this.currentPortfolios.get(contractId);
                if (positionToClose) {
                    this.closedPositions.set(contractId, positionToClose);
                    this.currentPortfolios.delete(contractId);
                    this.entryPrices.delete(contractId);
                    logPosition("Portfolios.mapPositions", positionToClose, true);
                }
            } else {
                const multiplier = position.contract.multiplier;
                if (multiplier) {
                    position.avgCost = position.avgCost / multiplier;
                }

                this.currentPortfolios.set(contractId, position);
                this.entryPrices.set(contractId, position.avgCost);

                if (this.closedPositions.has(contractId)) {
                    this.closedPositions.delete(contractId);
                }

                // When successful
                if (subscribe) {
                    const isBuy = position.pos > 0;
                    const whatToShow = isBuy ? WhatToShow.ASK : WhatToShow.BID;
                    const barSize = "5 secs";
                    MarketDataManager.Instance.getHistoricalDataUpdates(position.contract, barSize as BarSizeSetting, whatToShow);
                }
                logPosition("Portfolios.mapPositions", position);
            }

        }
        return position
    }

    /**
     * getPortfolios 
     */
    asyncPortfolios = async (): Promise<Position[]> => {
        const getPositions = await firstValueFrom(this.ib.getPositions());
        let positions: Position[] = [];
        getPositions.all.forEach((value, key) => {
            positions = compact(value.map((position) => this.mapPositions(position)));
        });

        return positions;
    }

    syncPortfolios = (): void => {
        MarketDataManager.Instance.init();
        this.GetPositions = this.ib.getPositions().subscribe((accountUpdates) => {
            accountUpdates.all.forEach((value, key) => {
                value.forEach((position) => this.mapPositions(position));
            });
        });
    }

    disconnect = () => {
        this.GetPositions.unsubscribe();
    }

    getPositions = async (): Promise<Position[]> => {
        return this.asyncPortfolios();
    }

    init = (): void => {
        if (!this.ib) {
            this.ib = IBKRConnection.Instance.ib;
            this.syncPortfolios();
        }
    };

}

export default Portfolios;

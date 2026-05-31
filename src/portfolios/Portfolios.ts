import { Subscription, catchError, firstValueFrom, of } from 'rxjs';
import { Position as IBPOSITION, IBApiNext, WhatToShow, BarSizeSetting } from '@stoqey/ib';
import IBKRConnection, { isMarketDataOnly } from '../connection/IBKRConnection';
import compact from 'lodash/compact';
import MarketDataManager from '../marketdata/MarketDataManager';
import { logPosition } from '../utils/log.utils';
import { log, warn } from '../utils/log';
import { isContractAllowed } from '../utils/contract-filter.utils';
import { IBKREvents, IBKREVENTS } from '../events';

const ibkrEvents = IBKREvents.Instance;

interface Position extends IBPOSITION {
    entryDate?: Date; // Date when the position was opened, imaginary when ibkr sees position first.
}

export class Portfolios {
    ib: IBApiNext;
    private static _instance: Portfolios;

    private currentPortfolios: Map<number, Position> = new Map();
    private closedPositions: Map<number, Position> = new Map();
    private entryPrices: Map<number, number> = new Map();
    private entryDates: Map<number, Date> = new Map();

    private GetPositions: Subscription;

    public static get Instance(): Portfolios {
        return this._instance || (this._instance = new this());
    }

    private constructor() { }

    get positions(): Position[] {
        return Array.from(this.currentPortfolios.values()).filter((position) => {
            return isContractAllowed(position?.contract, "positions");
        });
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

    getEntryDate = (conId: number): Date | undefined => {
        return this.entryDates.get(conId);
    }

    getLatestClosedPosition(conId: number): Position | undefined {
        return this.closedPositions.get(conId);
    }

    private emitPositionsUpdated = (): void => {
        ibkrEvents.emit(IBKREVENTS.IBKR_POSITIONS_UPDATED, { updatedAt: Date.now() });
    }

    mapPositions = (positionOg: Position, subscribe = false): Position => {
        if (!positionOg) {
            return;
        }

        let position: any = { ...positionOg };

        const contractId = position?.contract?.conId;
        if (position?.contract && !isContractAllowed(position.contract, "positions")) {
            if (contractId) {
                this.currentPortfolios.delete(contractId);
                this.entryPrices.delete(contractId);
                this.entryDates.delete(contractId);
            }
            return;
        }

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
                    this.entryDates.delete(contractId);
                    logPosition("Portfolios.mapPositions", positionToClose, true);
                }
            } else {
                const existingEntryDate = this.entryDates.get(contractId)
                    ?? this.currentPortfolios.get(contractId)?.entryDate
                    ?? position.entryDate;
                const entryDate = existingEntryDate ? new Date(existingEntryDate as Date) : new Date();
                position.entryDate = Number.isFinite(entryDate.getTime()) ? entryDate : new Date();
                const multiplier = position.contract.multiplier;
                if (multiplier) {
                    position.avgCost = position.avgCost / multiplier;
                }

                this.currentPortfolios.set(contractId, position);
                this.entryPrices.set(contractId, position.avgCost);
                this.entryDates.set(contractId, position.entryDate);

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
        if (isMarketDataOnly()) {
            log("Portfolios.asyncPortfolios", "MD_ONLY enabled, skipping portfolio snapshot");
            return [];
        }
        const getPositions = await firstValueFrom(this.ib.getPositions());
        let positions: Position[] = [];
        getPositions.all.forEach((value, key) => {
            positions = compact(value.map((position) => this.mapPositions(position)));
        });
        this.emitPositionsUpdated();

        return positions;
    }

    syncPortfolios = (): void => {
        if (isMarketDataOnly()) {
            log("Portfolios.syncPortfolios", "MD_ONLY enabled, skipping portfolio subscription");
            return;
        }
        MarketDataManager.Instance.init();
        if (this.GetPositions && !this.GetPositions.closed) {
            log("Portfolios.syncPortfolios", "positions subscription already active");
            return;
        }

        const subscription = this.ib.getPositions()
        
        .pipe(
            catchError((error) => {
                warn(`syncPortfolios`, `Error subscribing to positions`, error);
                this.GetPositions = undefined;
                return of(null);
            })
        )
        .subscribe((accountUpdates) => {
            if (!accountUpdates) {
                return;
            }
            accountUpdates.all.forEach((value, key) => {
                value.forEach((position) => this.mapPositions(position));
            });
            this.emitPositionsUpdated();
        });
        this.GetPositions = subscription.closed ? undefined : subscription;
    }

    disconnect = () => {
        this.GetPositions?.unsubscribe();
        this.GetPositions = undefined;
    }

    getPositions = async (): Promise<Position[]> => {
        return this.asyncPortfolios();
    }

    init = (): void => {
        if (isMarketDataOnly()) {
            log("Portfolios.init", "MD_ONLY enabled, skipping portfolio init");
            return;
        }
        if (!this.ib) {
            this.ib = IBKRConnection.Instance.ib;
            this.syncPortfolios();
        }
    };

}

export default Portfolios;

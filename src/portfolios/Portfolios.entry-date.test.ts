import 'mocha';
import { expect } from 'chai';
import { of } from 'rxjs';
import Portfolios from './Portfolios';
import { IBKREvents, IBKREVENTS } from '../events';

const contract = {
    conId: 987654,
    symbol: 'MNQ',
    secType: 'FUT',
    exchange: 'CME',
};

const buildPosition = (pos: number, entryDate: string, avgCost = 20500) => ({
    contract,
    pos,
    avgCost,
    marketPrice: avgCost,
    entryDate: new Date(entryDate),
});

const buildPositionWithContract = (positionContract: typeof contract, pos: number, entryDate: string, avgCost = 20500) => ({
    ...buildPosition(pos, entryDate, avgCost),
    contract: positionContract,
});

describe('IBKR Portfolios entry dates', () => {
    const originalContracts = process.env.IBKR_CONTRACTS;
    const originalPositionContracts = process.env.IBKR_CONTRACTS_POSITIONS;
    const ibkrEvents = IBKREvents.Instance;

    beforeEach(() => {
        const portfolios = Portfolios.Instance as any;
        portfolios.currentPortfolios = new Map();
        portfolios.closedPositions = new Map();
        portfolios.entryPrices = new Map();
        portfolios.entryDates = new Map();
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_POSITIONS_UPDATED);
        delete process.env.IBKR_CONTRACTS;
        delete process.env.IBKR_CONTRACTS_POSITIONS;
    });

    after(() => {
        if (originalContracts === undefined) {
            delete process.env.IBKR_CONTRACTS;
        } else {
            process.env.IBKR_CONTRACTS = originalContracts;
        }
        if (originalPositionContracts === undefined) {
            delete process.env.IBKR_CONTRACTS_POSITIONS;
        } else {
            process.env.IBKR_CONTRACTS_POSITIONS = originalPositionContracts;
        }
        ibkrEvents.removeAllListeners(IBKREVENTS.IBKR_POSITIONS_UPDATED);
    });

    it('should preserve entry date when active position updates', () => {
        // Arrange
        const portfolios = Portfolios.Instance;

        // Act
        const firstPosition = portfolios.mapPositions(buildPosition(1, '2026-05-13T13:30:00.000Z') as any);
        const updatedPosition = portfolios.mapPositions(buildPosition(2, '2026-05-13T13:35:00.000Z') as any);

        // Assert
        expect(firstPosition.entryDate?.toISOString()).to.equal('2026-05-13T13:30:00.000Z');
        expect(updatedPosition.entryDate?.toISOString()).to.equal('2026-05-13T13:30:00.000Z');
        expect(portfolios.getEntryDate(contract.conId)?.toISOString()).to.equal('2026-05-13T13:30:00.000Z');
    });

    it('should reset entry date when position closes and reopens', () => {
        // Arrange
        const portfolios = Portfolios.Instance;
        portfolios.mapPositions(buildPosition(1, '2026-05-13T13:30:00.000Z') as any);

        // Act
        portfolios.mapPositions({ ...buildPosition(0, '2026-05-13T13:40:00.000Z'), pos: 0 } as any);
        const reopenedPosition = portfolios.mapPositions(buildPosition(1, '2026-05-13T13:45:00.000Z') as any);

        // Assert
        expect(reopenedPosition.entryDate?.toISOString()).to.equal('2026-05-13T13:45:00.000Z');
        expect(portfolios.getEntryDate(contract.conId)?.toISOString()).to.equal('2026-05-13T13:45:00.000Z');
    });

    it('should emit positions updated once after position snapshot batch finishes', async () => {
        const portfolios = Portfolios.Instance as any;
        const secondContract = { ...contract, conId: 987655, symbol: 'ES' };
        let eventPayload: { updatedAt: number };
        let observedPositionIds: number[];
        let eventCount = 0;

        portfolios.ib = {
            getPositions: () => of({
                all: new Map([
                    ['DU123', [
                        buildPositionWithContract(contract, 1, '2026-05-13T13:30:00.000Z'),
                        buildPositionWithContract(secondContract, 1, '2026-05-13T13:35:00.000Z'),
                    ]],
                ]),
            }),
        };

        const listener = (payload) => {
            eventCount += 1;
            eventPayload = payload;
            observedPositionIds = portfolios.positions.map((position) => position.contract.conId);
        };

        ibkrEvents.on(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);
        await portfolios.asyncPortfolios();
        ibkrEvents.removeListener(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);

        expect(eventCount).to.equal(1);
        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedPositionIds).to.deep.equal([contract.conId, secondContract.conId]);
    });

    it('should emit positions updated after an empty position snapshot', async () => {
        const portfolios = Portfolios.Instance as any;
        let eventPayload: { updatedAt: number };
        let observedPositionIds: number[];
        let eventCount = 0;

        portfolios.ib = {
            getPositions: () => of({
                all: new Map([
                    ['DU123', []],
                ]),
            }),
        };

        const listener = (payload) => {
            eventCount += 1;
            eventPayload = payload;
            observedPositionIds = portfolios.positions.map((position) => position.contract.conId);
        };

        ibkrEvents.on(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);
        const positions = await portfolios.asyncPortfolios();
        ibkrEvents.removeListener(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);

        expect(positions).to.deep.equal([]);
        expect(eventCount).to.equal(1);
        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedPositionIds).to.deep.equal([]);
    });

    it('should emit positions updated after an empty position subscription batch', () => {
        const portfolios = Portfolios.Instance as any;
        let eventPayload: { updatedAt: number };
        let observedPositionIds: number[];
        let eventCount = 0;

        portfolios.ib = {
            getPositions: () => of({
                all: new Map([
                    ['DU123', []],
                ]),
            }),
        };

        const listener = (payload) => {
            eventCount += 1;
            eventPayload = payload;
            observedPositionIds = portfolios.positions.map((position) => position.contract.conId);
        };

        ibkrEvents.on(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);
        portfolios.syncPortfolios();
        ibkrEvents.removeListener(IBKREVENTS.IBKR_POSITIONS_UPDATED, listener);

        expect(eventCount).to.equal(1);
        expect(eventPayload.updatedAt).to.be.a('number');
        expect(observedPositionIds).to.deep.equal([]);
    });
});

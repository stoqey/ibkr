import 'mocha';
import { expect } from 'chai';
import Portfolios from './Portfolios';

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

describe('IBKR Portfolios entry dates', () => {
    beforeEach(() => {
        const portfolios = Portfolios.Instance as any;
        portfolios.currentPortfolios = new Map();
        portfolios.closedPositions = new Map();
        portfolios.entryPrices = new Map();
        portfolios.entryDates = new Map();
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
});
